import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("🌱 Seeding DeskGuard database...\n");

  // ── 1. Seats ──────────────────────────────────────────────────────────────
  const seatDefinitions = [
    // Reading Hall A — 12 seats
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `A${String(i + 1).padStart(3, "0")}`,
      section: "Reading Hall A",
    })),
    // Reading Hall B — 12 seats
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `B${String(i + 1).padStart(3, "0")}`,
      section: "Reading Hall B",
    })),
    // Silent Zone — 8 seats
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `S${String(i + 1).padStart(3, "0")}`,
      section: "Silent Zone",
    })),
  ];

  let seatsCreated = 0;
  for (const seat of seatDefinitions) {
    await prisma.seat.upsert({
      where: { id: seat.id },
      update: {},
      create: { id: seat.id, section: seat.section, status: "AVAILABLE" },
    });
    seatsCreated++;
  }
  console.log(`✅ ${seatsCreated} seats seeded (A001–A012, B001–B012, S001–S008)`);

  // ── 2. Admin / Librarian account ──────────────────────────────────────────
  const adminEmail = "admin@deskguard.college";
  const adminPassword = "DeskGuard@2025";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashPassword(adminPassword), role: "LIBRARIAN" },
    create: {
      email: adminEmail,
      name: "DeskGuard Admin",
      role: "LIBRARIAN",
      password: hashPassword(adminPassword),
    },
  });

  console.log(`✅ Admin account ready`);
  console.log(`   Email   : ${admin.email}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`   Role    : ${admin.role}`);
  console.log(`   ID      : ${admin.id}`);
  console.log("\n🚀 Seed complete! You can log in at /login");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
