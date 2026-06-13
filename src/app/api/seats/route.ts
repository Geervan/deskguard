import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runSweeper } from "@/lib/sweeper";
import { getSessionPayload } from "@/lib/auth";

export async function GET() {
  try {
    // 1. Run sweeper inline for lazy-evaluation cleanup
    const sweepResult = await runSweeper();
    if (sweepResult.actions.length > 0) {
      console.log("[Sweeper] Inline lazy sweep executed:", sweepResult.actions);
    }

    // 2. Fetch all seats
    const seats = await prisma.seat.findMany({
      orderBy: { id: "asc" }
    });

    // 3. Fetch active sessions (endedAt is null)
    const activeSessions = await prisma.seatSession.findMany({
      where: { endedAt: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        }
      }
    });

    // 4. Map sessions to their seats for easy UI consumption
    const sessionsMap: Record<string, typeof activeSessions[0]> = {};
    for (const session of activeSessions) {
      sessionsMap[session.seatId] = session;
    }

    // 5. Calculate statistics
    const totalSeats = seats.length;
    const occupiedSeats = seats.filter(s => s.status === "OCCUPIED").length;
    const awaySeats = seats.filter(s => s.status === "AWAY").length;
    const availableSeats = seats.filter(s => s.status === "AVAILABLE").length;
    const occupancyRate = totalSeats > 0 ? Math.round(((occupiedSeats + awaySeats) / totalSeats) * 100) : 0;

    // 6. Fetch recent activity log history for Librarian Dashboard (last 20 logs)
    const recentLogs = await prisma.activityLog.findMany({
      take: 20,
      orderBy: { timestamp: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    const session = await getSessionPayload();
    const isAdmin = session?.role === "LIBRARIAN";
    const currentUserId = session?.userId;

    return NextResponse.json({
      success: true,
      seats: seats.map(seat => {
        const activeSession = sessionsMap[seat.id];
        if (!activeSession) return { ...seat, activeSession: null };

        const showDetails = isAdmin || (currentUserId && activeSession.userId === currentUserId);

        return {
          ...seat,
          activeSession: {
            id: activeSession.id,
            userId: activeSession.userId,
            startedAt: activeSession.startedAt,
            awayUntil: activeSession.awayUntil,
            nextPresenceCheckAt: activeSession.nextPresenceCheckAt,
            user: showDetails ? activeSession.user : {
              id: activeSession.userId,
              name: "Occupied",
              email: "hidden@deskguard.edu",
              role: "STUDENT"
            }
          }
        };
      }),
      stats: {
        total: totalSeats,
        occupied: occupiedSeats,
        away: awaySeats,
        available: availableSeats,
        occupancyRate
      },
      recentLogs: recentLogs.map(log => ({
        id: log.id,
        seatId: log.seatId,
        action: log.action,
        timestamp: log.timestamp,
        userName: isAdmin ? (log.user.name || log.user.email) : "Student",
        userEmail: isAdmin ? log.user.email : "hidden@deskguard.edu"
      })),
      sweepResult
    });
  } catch (error: any) {
    console.error("Failed to fetch seats:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
