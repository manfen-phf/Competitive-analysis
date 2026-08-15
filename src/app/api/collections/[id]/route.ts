import { getCloudflareContext } from "@opennextjs/cloudflare";
import { currentBd } from "@/lib/bd-api";
import { confirmCollection, getCollectionDetail } from "@/lib/collection-recognition";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

type Context = { params: Promise<{ id: string }> };

async function dependencies(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("Cloudflare D1 binding DB is required");
  const bd = await currentBd(request, await getRuntimeSecret("BD_SESSION_SECRET") ?? "");
  if (!bd) return { error: Response.json({ error: "请先选择 BD 身份" }, { status: 401 }) };
  return { db: env.DB, bd };
}

export async function GET(request: Request, context: Context) {
  const resolved = await dependencies(request);
  if ("error" in resolved) return resolved.error;
  try { return Response.json(await getCollectionDetail(resolved.db, (await context.params).id, resolved.bd.userId)); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "读取采集任务失败" }, { status: 404 }); }
}

export async function POST(request: Request, context: Context) {
  const resolved = await dependencies(request);
  if ("error" in resolved) return resolved.error;
  try {
    const payload = await request.json() as { results?: unknown };
    if (!Array.isArray(payload.results)) return Response.json({ error: "请提交美团和 B 家两份识别结果" }, { status: 400 });
    await confirmCollection({ db: resolved.db, collectionSessionId: (await context.params).id, bdUserId: resolved.bd.userId, results: payload.results as never });
    return Response.json({ status: "CONFIRMED" });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "确认保存失败" }, { status: 422 }); }
}
