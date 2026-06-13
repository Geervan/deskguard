import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn("⚠️  DATABASE_URL is not set — Prisma will fail on DB calls.");
    return new PrismaClient();
  }

  // Prisma 7: PrismaPg is a factory (SqlMigrationAwareDriverAdapterFactory).
  // Pass the connection string directly — it manages its own pool internally.
  const adapter = new PrismaPg(connectionString);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalThis._prisma ?? createPrismaClient();

// In dev, cache on globalThis to survive HMR reloads without leaking connections.
if (process.env.NODE_ENV !== "production") {
  globalThis._prisma = prisma;
}
