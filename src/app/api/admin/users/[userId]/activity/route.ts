import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionPayload } from "@/lib/auth";

export async function GET(request: Request, context: { params: { userId: string } | Promise<{ userId: string }> }) {
  try {
    const session = await getSessionPayload();
    if (!session || session.role !== "LIBRARIAN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }
    const { userId } = await context.params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const seatId = searchParams.get("seatId") || undefined;

    const logs = await prisma.activityLog.findMany({
      where: {
        userId,
        ...(seatId ? { seatId } : {})
      },
      orderBy: { timestamp: "desc" },
      include: {
        seat: {
          select: {
            id: true,
            section: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      user: logs[0]
        ? {
            id: logs[0].user.id,
            name: logs[0].user.name,
            email: logs[0].user.email
          }
        : null,
      logs: logs.map((log) => ({
        id: log.id,
        seatId: log.seatId,
        seatSection: log.seat.section,
        action: log.action,
        timestamp: log.timestamp
      }))
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch user activity";
    console.error("Failed to fetch user activity:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
