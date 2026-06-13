import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST() {
  try {
    // 1. Clean existing data in order of dependency
    await prisma.activityLog.deleteMany({});
    await prisma.seatSession.deleteMany({});
    await prisma.otp.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.seat.deleteMany({});

    const defaultPassword = crypto.createHash("sha256").update("password123").digest("hex");

    // 2. Create users
    const student1 = await prisma.user.create({
      data: {
        email: "alex.mercer@college.edu",
        name: "Alex Mercer",
        role: "STUDENT",
        password: defaultPassword
      }
    });

    const student2 = await prisma.user.create({
      data: {
        email: "sarah.connor@college.edu",
        name: "Sarah Connor",
        role: "STUDENT",
        password: defaultPassword
      }
    });

    const librarian = await prisma.user.create({
      data: {
        email: "librarian@college.edu",
        name: "Elena Rostova (Librarian)",
        role: "LIBRARIAN",
        password: defaultPassword
      }
    });

    // 3. Create seats
    const sections = [
      { name: "Reading Hall A", count: 8, prefix: "A" },
      { name: "Reading Hall B", count: 8, prefix: "B" },
      { name: "Silent Zone", count: 6, prefix: "S" }
    ];

    const seatsData = [];
    for (const section of sections) {
      for (let i = 1; i <= section.count; i++) {
        seatsData.push({
          id: `${section.prefix}${i < 10 ? "0" + i : i}`,
          section: section.name,
          status: "AVAILABLE" as const
        });
      }
    }

    // Insert seats
    for (const seat of seatsData) {
      await prisma.seat.create({ data: seat });
    }

    // Update A02 to be OCCUPIED by student 2
    await prisma.seat.update({
      where: { id: "A02" },
      data: { status: "OCCUPIED" }
    });

    // Create an active session for A02
    const sessionA02 = await prisma.seatSession.create({
      data: {
        userId: student2.id,
        seatId: "A02",
        startedAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000), // 3.5 hours ago
        nextPresenceCheckAt: new Date(Date.now() + 30 * 60 * 1000) // in 30 mins
      }
    });

    // Update B05 to be AWAY by student 1
    await prisma.seat.update({
      where: { id: "B05" },
      data: { status: "AWAY" }
    });

    // Create an active session for B05 in AWAY status
    const sessionB05 = await prisma.seatSession.create({
      data: {
        userId: student1.id,
        seatId: "B05",
        startedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
        awayUntil: new Date(Date.now() + 12 * 60 * 1000), // 12 mins remaining
        nextPresenceCheckAt: new Date(Date.now() + 1.2 * 60 * 60 * 1000)
      }
    });

    // 4. Create historical logs
    const historicalLogs = [
      {
        userId: student2.id,
        seatId: "A02",
        action: "CHECK_IN" as const,
        timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000)
      },
      {
        userId: student2.id,
        seatId: "A02",
        action: "PRESENCE_CONFIRMED" as const,
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000)
      },
      {
        userId: student1.id,
        seatId: "B05",
        action: "CHECK_IN" as const,
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000)
      },
      {
        userId: student1.id,
        seatId: "B05",
        action: "TAKE_BREAK" as const,
        timestamp: new Date(Date.now() - 8 * 60 * 1000) // 8 mins ago
      }
    ];

    for (const log of historicalLogs) {
      await prisma.activityLog.create({ data: log });
    }

    return NextResponse.json({
      success: true,
      message: "Database successfully cleared and seeded with mock data.",
      details: {
        seatsCount: seatsData.length,
        usersCount: 3,
        activeSessions: 2
      }
    });
  } catch (error: any) {
    console.error("Failed to seed database:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
