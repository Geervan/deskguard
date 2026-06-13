import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionPayload } from "@/lib/auth";

export async function GET(_request: Request, context: { params: { seatId: string } | Promise<{ seatId: string }> }) {
  try {
    const session = await getSessionPayload();
    if (!session || session.role !== "LIBRARIAN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }
    const { seatId } = await context.params;

    if (!seatId) {
      return NextResponse.json(
        { success: false, error: "Seat ID is required" },
        { status: 400 }
      );
    }

    const logs = await prisma.activityLog.findMany({
      where: { seatId },
      orderBy: { timestamp: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const usersMap = new Map<string, {
      id: string;
      name: string | null;
      email: string;
      activityCount: number;
      lastSeenAt: Date;
      lastAction: string;
    }>();

    for (const log of logs) {
      const existing = usersMap.get(log.user.id);
      if (existing) {
        existing.activityCount += 1;
        if (log.timestamp > existing.lastSeenAt) {
          existing.lastSeenAt = log.timestamp;
          existing.lastAction = log.action;
        }
      } else {
        usersMap.set(log.user.id, {
          id: log.user.id,
          name: log.user.name,
          email: log.user.email,
          activityCount: 1,
          lastSeenAt: log.timestamp,
          lastAction: log.action
        });
      }
    }

    return NextResponse.json({
      success: true,
      seatId,
      users: Array.from(usersMap.values()).sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch seat users";
    console.error("Failed to fetch seat users:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
