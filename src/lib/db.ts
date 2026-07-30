import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";
import type { D1Database } from "@cloudflare/workers-types";

declare global { interface CloudflareEnv { DB?: D1Database } }

const localPrisma = globalThis.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.__prisma = localPrisma;

export async function getPrisma() {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    if (env.DB) return new PrismaClient({ adapter: new PrismaD1(env.DB) });
  } catch { /* Local Next.js development uses SQLite. */ }
  return localPrisma;
}

declare global { var __prisma: PrismaClient | undefined; }
