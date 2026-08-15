import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import { NextResponse } from "next/server";
import { handleManagementMerchantsGet } from "@/lib/management-api";

export async function GET(request: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = (env as { DB?: D1Database }).DB;
    if (!db) throw new Error("Cloudflare D1 binding DB is required");
    return handleManagementMerchantsGet(request, db);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Merchant search is unavailable" }, { status: 500 });
  }
}
