import { getCloudflareContext } from "@opennextjs/cloudflare";
import { currentBd } from "@/lib/bd-api";
import { recognizeCollection } from "@/lib/collection-recognition";
import { createQwenRecognitionProvider } from "@/lib/recognition-provider";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB || !env.SCREENSHOT_BUCKET) throw new Error("Cloudflare D1 and R2 bindings are required");
  const bd = await currentBd(request, await getRuntimeSecret("BD_SESSION_SECRET") ?? "");
  if (!bd) return Response.json({ error: "请先选择 BD 身份" }, { status: 401 });
  const apiKey = await getRuntimeSecret("QWEN_API_KEY") ?? "";
  if (!apiKey) return Response.json({ error: "千问识别服务尚未配置，请联系管理员" }, { status: 503 });
  try {
    const result = await recognizeCollection({
      db: env.DB,
      bucket: env.SCREENSHOT_BUCKET,
      collectionSessionId: (await context.params).id,
      bdUserId: bd.userId,
      provider: createQwenRecognitionProvider({ apiKey, model: (await getRuntimeSecret("QWEN_MODEL")) || "qwen-vl-plus" }),
    });
    return Response.json({ status: result.status });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "识别任务失败" }, { status: 422 }); }
}
