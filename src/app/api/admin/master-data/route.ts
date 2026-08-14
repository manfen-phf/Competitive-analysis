import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import { NextResponse } from "next/server";
import { handleMasterDataGet, handleMasterDataPost, type MasterDataDependencies } from "@/lib/master-data-api";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function runtimeDependencies(): Promise<MasterDataDependencies> {
  const { env } = await getCloudflareContext({ async: true });
  const runtimeEnv = env as { DB?: D1Database; ADMIN_IMPORT_PASSCODE?: string };
  if (!runtimeEnv.DB) throw new Error("Cloudflare D1 binding DB is required");
  if (!runtimeEnv.ADMIN_IMPORT_PASSCODE) throw new Error("ADMIN_IMPORT_PASSCODE is required");
  return { db: runtimeEnv.DB, adminPasscode: runtimeEnv.ADMIN_IMPORT_PASSCODE };
}

export async function POST(request: Request) {
  try {
    return await handleMasterDataPost(request, await runtimeDependencies());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "服务配置错误", 500);
  }
}

export async function GET(request: Request) {
  try {
    const { db } = await runtimeDependencies();
    return await handleMasterDataGet(request, db);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "服务配置错误", 500);
  }
}
