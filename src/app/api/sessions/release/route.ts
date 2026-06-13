import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { seatId } = body;

    let activeSession = null;
    let endedByRole = currentUser.role;

    if (currentUser.role === "LIBRARIAN") {
      if (!seatId) {
        return NextResponse.json(
          { success: false, error: "Librarian must specify which seatId to release" },
          { status: 400 }
        );
      }
      
      activeSession = await prisma.seatSession.findFirst({
        where: {
          seatId: seatId,
          endedAt: null
        }
      });
    } else {
      // Students can only release their own active session
      activeSession = await prisma.seatSession.findFirst({
        where: {
          userId: currentUser.id,
          endedAt: null
        }
      });
    }

    if (!activeSession) {
      return NextResponse.json(
        { success: false, error: "No active seat reservation found to release" },
        { status: 400 }
      );
    }

    const now = new Date();
    const actionType = endedByRole === "LIBRARIAN" ? "RELEASED_BY_LIBRARIAN" as const : "SESSION_ENDED_BY_STUDENT" as const;

    // Execute release transaction
    await prisma.$transaction([
      prisma.seatSession.update({
        where: { id: activeSession.id },
        data: { endedAt: now }
      }),
      prisma.seat.update({
        where: { id: activeSession.seatId },
        data: { status: "AVAILABLE" }
      }),
      prisma.activityLog.create({
        data: {
          userId: activeSession.userId, // Log it under the student's ID for history
          seatId: activeSession.seatId,
          action: actionType,
          timestamp: now
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: `Seat ${activeSession.seatId} has been successfully released.`,
      seatId: activeSession.seatId
    });
  } catch (error: any) {
    console.error("Failed to release seat:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
