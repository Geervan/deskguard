import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required for simulator" },
        { status: 401 }
      );
    }

    const { minutes, seatId } = await request.json();

    if (!minutes || typeof minutes !== "number") {
      return NextResponse.json(
        { success: false, error: "Minutes parameter must be a number" },
        { status: 400 }
      );
    }

    // Find the session to time travel
    let activeSession = null;

    if (seatId) {
      activeSession = await prisma.seatSession.findFirst({
        where: {
          seatId: seatId,
          endedAt: null
        }
      });
    } else {
      // Find the current user's active session
      activeSession = await prisma.seatSession.findFirst({
        where: {
          userId: user.id,
          endedAt: null
        }
      });
    }

    if (!activeSession) {
      return NextResponse.json(
        { success: false, error: "No active session found to manipulate" },
        { status: 404 }
      );
    }

    const offsetMs = minutes * 60 * 1000;
    
    // Shift timestamps backward to simulate time passing forward
    const newStartedAt = new Date(activeSession.startedAt.getTime() - offsetMs);
    const newNextPresenceCheckAt = activeSession.nextPresenceCheckAt 
      ? new Date(activeSession.nextPresenceCheckAt.getTime() - offsetMs)
      : null;
    const newAwayUntil = activeSession.awayUntil 
      ? new Date(activeSession.awayUntil.getTime() - offsetMs)
      : null;

    const updatedSession = await prisma.seatSession.update({
      where: { id: activeSession.id },
      data: {
        startedAt: newStartedAt,
        nextPresenceCheckAt: newNextPresenceCheckAt,
        awayUntil: newAwayUntil
      }
    });

    return NextResponse.json({
      success: true,
      message: `Simulated ${minutes} minutes passing. Database timestamps shifted.`,
      session: {
        id: updatedSession.id,
        startedAt: updatedSession.startedAt,
        nextPresenceCheckAt: updatedSession.nextPresenceCheckAt,
        awayUntil: updatedSession.awayUntil
      }
    });
  } catch (error: any) {
    console.error("Time travel simulation failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
