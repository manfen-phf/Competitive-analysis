import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

export async function getPrisma(): Promise<PrismaClient> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the PostgreSQL database connection.");
  }

  const prisma = globalThis.__prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
  return prisma;
}