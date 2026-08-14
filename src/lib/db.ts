import type { PrismaClient } from "@prisma/client";
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

declare global {
  var __prisma: PrismaClient | undefined;
  interface CloudflareEnv {
    DB?: D1Database;
    SCREENSHOT_BUCKET?: R2Bucket;
  }
}

export async function getPrisma(): Promise<PrismaClient> {
  const { PrismaClient } = await import("@prisma/client");

  if (process.env.NODE_ENV === "production") {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    if (!env.DB) throw new Error("Cloudflare D1 binding DB is required");

    const { PrismaD1 } = await import("@prisma/adapter-d1");
    return new PrismaClient({ adapter: new PrismaD1(env.DB) });
  }

  const localPrisma = globalThis.__prisma ?? new PrismaClient();
  globalThis.__prisma = localPrisma;
  return localPrisma;
}
