import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const seatId = searchParams.get("seatId") || undefined;

    const logs = await prisma.activityLog.findMany({
      where: {
        userId: user.id,
        ...(seatId ? { seatId } : {})
      },
      orderBy: { timestamp: "desc" },
      include: {
        seat: {
          select: {
            id: true,
            section: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      logs: logs.map((log) => ({
        id: log.id,
        seatId: log.seatId,
        seatSection: log.seat.section,
        action: log.action,
        timestamp: log.timestamp
      }))
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch personal activity";
    console.error("Failed to fetch personal activity:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
