import { prisma } from "./db";

export interface SweepResult {
  expiredBreaksCount: number;
  missedPresenceChecksCount: number;
  actions: string[];
}

export async function runSweeper(): Promise<SweepResult> {
  const now = new Date();
  const result: SweepResult = {
    expiredBreaksCount: 0,
    missedPresenceChecksCount: 0,
    actions: []
  };

  try {
    // 1. Find sessions with expired AWAY states that don't have a grace period set yet
    const expiredAwaySessions = await prisma.seatSession.findMany({
      where: {
        endedAt: null,
        awayUntil: {
          lt: now
        },
        breakGracePeriodEnd: null
      },
      include: {
        seat: true,
        user: true
      }
    });

    for (const session of expiredAwaySessions) {
      // Set a 5-minute grace period for the user to respond
      const gracePeriodEnd = new Date(session.awayUntil!.getTime() + 5 * 60 * 1000);
      
      await prisma.seatSession.update({
        where: { id: session.id },
        data: {
          breakGracePeriodEnd: gracePeriodEnd
        }
      });

      const studentName = session.user.name || session.user.email;
      result.expiredBreaksCount++;
      result.actions.push(
        `[Break Expired] Set 5-min grace period for seat ${session.seatId} occupied by ${studentName} (break expired at ${session.awayUntil?.toLocaleTimeString()})`
      );
    }

    // 2. Find sessions where the break grace period has expired
    const expiredGracePeriodSessions = await prisma.seatSession.findMany({
      where: {
        endedAt: null,
        breakGracePeriodEnd: {
          lt: now
        }
      },
      include: {
        seat: true,
        user: true
      }
    });

    for (const session of expiredGracePeriodSessions) {
      await prisma.$transaction([
        prisma.seatSession.update({
          where: { id: session.id },
          data: {
            endedAt: now,
            abandoned: true
          }
        }),
        prisma.seat.update({
          where: { id: session.seatId },
          data: { status: "AVAILABLE" }
        }),
        prisma.activityLog.create({
          data: {
            userId: session.userId,
            seatId: session.seatId,
            action: "AUTO_RELEASED",
            timestamp: now
          }
        })
      ]);

      const studentName = session.user.name || session.user.email;
      result.expiredBreaksCount++;
      result.actions.push(
        `[Grace Period Expired] Released seat ${session.seatId} occupied by ${studentName} (no response within grace period)`
      );
    }

    // 2. Find missed presence checks
    // We provide a 5-minute grace period after nextPresenceCheckAt before automatically releasing the seat
    const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes grace period
    const presenceThreshold = new Date(now.getTime() - GRACE_PERIOD_MS);

    const missedPresenceSessions = await prisma.seatSession.findMany({
      where: {
        endedAt: null,
        nextPresenceCheckAt: {
          lt: presenceThreshold
        }
      },
      include: {
        seat: true,
        user: true
      }
    });

    for (const session of missedPresenceSessions) {
      await prisma.$transaction([
        prisma.seatSession.update({
          where: { id: session.id },
          data: {
            endedAt: now,
            abandoned: true
          }
        }),
        prisma.seat.update({
          where: { id: session.seatId },
          data: { status: "AVAILABLE" }
        }),
        prisma.activityLog.create({
          data: {
            userId: session.userId,
            seatId: session.seatId,
            action: "PRESENCE_CHECK_MISSED",
            timestamp: now
          }
        })
      ]);

      const studentName = session.user.name || session.user.email;
      result.missedPresenceChecksCount++;
      result.actions.push(
        `[Presence Check Missed] Released seat ${session.seatId} occupied by ${studentName} (no response within grace period since ${session.nextPresenceCheckAt?.toLocaleTimeString()})`
      );
    }
  } catch (error) {
    console.error("Error during seat session sweeping:", error);
  }

  return result;
}
