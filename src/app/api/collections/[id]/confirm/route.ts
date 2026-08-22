import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { confirmCollection, type CollectionReviewInput, type ConfirmationDatabase } from "@/lib/collection-confirmation";
import { getPrisma } from "@/lib/db";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "采集任务不存在" }, { status: 404 });

  let body: { reviews?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "请求格式无效" }, { status: 400 }); }
  if (!Array.isArray(body.reviews)) return NextResponse.json({ error: "请提交两个平台的校对字段" }, { status: 400 });

  const prisma = await getPrisma();
  const collection = await prisma.collectionTask.findUnique({
    where: { id },
    include: { uploads: { select: { id: true, platform: true, recognitionStatus: true, recognitionResult: true, uploadedAt: true } } },
  });
  if (!collection) return NextResponse.json({ error: "采集任务不存在" }, { status: 404 });

  const response = await confirmCollection({
    collection,
    user,
    reviews: body.reviews as CollectionReviewInput[],
    database: prisma as unknown as ConfirmationDatabase,
  });
  if (!response.ok) {
    const status = response.error === "无权操作此采集任务" ? 403 : 400;
    return NextResponse.json(response, { status });
  }
  return NextResponse.json(response);
}
