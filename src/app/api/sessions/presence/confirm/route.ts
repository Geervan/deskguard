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
    // Schedule next presence check in 2 hours
    const nextPresenceCheckAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Update presence check timestamp
    await prisma.$transaction([
      prisma.seatSession.update({
        where: { id: activeSession.id },
        data: { nextPresenceCheckAt }
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          seatId: activeSession.seatId,
          action: "PRESENCE_CONFIRMED",
          timestamp: now
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: "Presence confirmed. Next check scheduled in 2 hours.",
      nextPresenceCheckAt
    });
  } catch (error: any) {
    console.error("Failed to confirm presence:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
