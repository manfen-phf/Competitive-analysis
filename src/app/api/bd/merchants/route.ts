import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleBdMerchantsGet } from "@/lib/bd-api";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

export async function GET(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("Cloudflare D1 binding DB is required");
  return handleBdMerchantsGet(request, { db: env.DB, sessionSecret: await getRuntimeSecret("BD_SESSION_SECRET") ?? "" });
}
