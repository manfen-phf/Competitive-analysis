import type { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

export async function getPrisma(): Promise<PrismaClient> {
  const { PrismaClient } = await import("@prisma/client");
  globalThis.__prisma ??= new PrismaClient();
  return globalThis.__prisma;
}