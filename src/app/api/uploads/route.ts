import { getCloudflareContext } from "@opennextjs/cloudflare";
import { currentBd, handleCollectionPost } from "@/lib/bd-api";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB || !env.SCREENSHOT_BUCKET) throw new Error("Cloudflare D1 and R2 bindings are required");
  const sessionSecret = await getRuntimeSecret("BD_SESSION_SECRET") ?? "";
  const bd = await currentBd(request, sessionSecret);
  if (!bd) return Response.json({ error: "请先选择 BD 身份" }, { status: 401 });
  return handleCollectionPost(request, { db: env.DB, bucket: env.SCREENSHOT_BUCKET, bd });
}
