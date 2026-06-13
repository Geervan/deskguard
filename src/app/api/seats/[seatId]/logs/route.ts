import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionPayload } from "@/lib/auth";

// GET /api/seats/[seatId]/logs
// Returns users who have ever used this seat + optionally their per-seat activity logs
export async function GET(
  request: Request,
  { params }: { params: Promise<{ seatId: string }> }
) {
  try {
    const session = await getSessionPayload();
    if (!session || session.role !== "LIBRARIAN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }
    const { seatId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const dateStr = searchParams.get("date");
    const tzOffset = searchParams.get("tzOffset");

    if (userId) {
      // Return activity logs for a specific user on this seat
      const logs = await prisma.activityLog.findMany({
        where: { seatId, userId },
        orderBy: { timestamp: "desc" },
        take: 50,
        select: {
          id: true,
          seatId: true,
          action: true,
          timestamp: true,
        },
      });

      return NextResponse.json({ success: true, logs });
    }

    const dateQuery: any = {};
    if (dateStr) {
      const [year, month, day] = dateStr.split("-").map(Number);
      const localStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const offsetMinutes = tzOffset ? parseInt(tzOffset, 10) : 0;
      const startUtc = new Date(localStart.getTime() + offsetMinutes * 60 * 1000);
      const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000 - 1);
      
      dateQuery.timestamp = {
        gte: startUtc,
        lte: endUtc,
      };
    }

    // Return all distinct users who have activity logs on this seat on the filtered date
    const rawLogs = await prisma.activityLog.findMany({
      where: { 
        seatId,
        ...dateQuery
      },
      orderBy: { timestamp: "desc" },
      select: {
        id: true,
        userId: true,
        action: true,
        timestamp: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Aggregate per-user: count events, last seen, last action
    const userMap = new Map<
      string,
      {
        id: string;
        name: string | null;
        email: string;
        activityCount: number;
        lastSeenAt: string;
        lastAction: string;
      }
    >();

    for (const log of rawLogs) {
      const existing = userMap.get(log.userId);
      if (!existing) {
        userMap.set(log.userId, {
          id: log.user.id,
          name: log.user.name,
          email: log.user.email,
          activityCount: 1,
          lastSeenAt: log.timestamp.toISOString(),
          lastAction: log.action,
        });
      } else {
        existing.activityCount += 1;
        // logs are ordered desc so first seen = most recent
      }
    }

    return NextResponse.json({
      success: true,
      users: Array.from(userMap.values()),
    });
  } catch (error: any) {
    console.error("Failed to fetch seat logs:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
