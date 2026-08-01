import type { PrismaClient } from "@prisma/client";
import type { D1Database } from "@cloudflare/workers-types";

declare global {
  var __prisma: PrismaClient | undefined;
  interface CloudflareEnv { DB?: D1Database; }
}

export async function getPrisma(): Promise<PrismaClient> {
  const { PrismaClient } = await import("@prisma/client");
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    if (env.DB) {
      const { PrismaD1 } = await import("@prisma/adapter-d1");
      return new PrismaClient({ adapter: new PrismaD1(env.DB) });
    }
  } catch {
    // Local tooling uses the SQLite client below.
  }

  const localPrisma = globalThis.__prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== "production") globalThis.__prisma = localPrisma;
  return localPrisma;
}
