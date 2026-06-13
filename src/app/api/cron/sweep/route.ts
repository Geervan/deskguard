import { NextResponse } from "next/server";
import { runSweeper } from "@/lib/sweeper";

export async function GET() {
  try {
    const sweepResult = await runSweeper();
    return NextResponse.json({
      success: true,
      timestamp: new Date(),
      ...sweepResult
    });
  } catch (error: any) {
    console.error("Cron sweep failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
