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

    if (!activeSession.awayUntil) {
      return NextResponse.json(
        { success: false, error: "You are not currently on a break" },
        { status: 400 }
      );
    }

    const now = new Date();

    // End break: set seat back to OCCUPIED and clear awayUntil
    await prisma.$transaction([
      prisma.seatSession.update({
        where: { id: activeSession.id },
        data: { awayUntil: null }
      }),
      prisma.seat.update({
        where: { id: activeSession.seatId },
        data: { status: "OCCUPIED" }
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          seatId: activeSession.seatId,
          action: "RETURN_FROM_BREAK",
          timestamp: now
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: "Welcome back! Seat status restored to occupied."
    });
  } catch (error: any) {
    console.error("Failed to end break:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
