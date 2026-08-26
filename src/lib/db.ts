import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function makeClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
  // Eager connect — buka koneksi pool saat module pertama di-load,
  // bukan saat query pertama dieksekusi. Mencegah cold start error.
  prisma.$connect().catch((e) => {
    console.error("[db] failed to connect on startup:", e);
  });
}
