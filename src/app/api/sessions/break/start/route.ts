import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Find active session
    const activeSession = await prisma.seatSession.findFirst({
      where: {
        userId: user.id,
        endedAt: null
      }
    });

    if (!activeSession) {
      return NextResponse.json(
        { success: false, error: "You do not have an active seat reservation" },
        { status: 400 }
      );
    }

    const now = new Date();
    // Maximum break time is 20 minutes
    const awayUntil = new Date(now.getTime() + 20 * 60 * 1000);

    // Update session and seat status
    await prisma.$transaction([
      prisma.seatSession.update({
        where: { id: activeSession.id },
        data: { awayUntil }
      }),
      prisma.seat.update({
        where: { id: activeSession.seatId },
        data: { status: "AWAY" }
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          seatId: activeSession.seatId,
          action: "TAKE_BREAK",
          timestamp: now
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: "Break started. You have 20 minutes to return.",
      awayUntil
    });
  } catch (error: any) {
    console.error("Failed to start break:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
