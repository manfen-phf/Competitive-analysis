import { getCloudflareContext } from "@opennextjs/cloudflare";
import { handleBdIdentitiesGet, handleBdSessionDelete, handleBdSessionPost } from "@/lib/bd-api";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

async function dependencies() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("Cloudflare D1 binding DB is required");
  return { db: env.DB, sessionSecret: await getRuntimeSecret("BD_SESSION_SECRET") ?? "" };
}

export async function GET() {
  const { db } = await dependencies();
  return handleBdIdentitiesGet({ db });
}

export async function POST(request: Request) {
  return handleBdSessionPost(request, await dependencies());
}

export async function DELETE() {
  return handleBdSessionDelete();
}
