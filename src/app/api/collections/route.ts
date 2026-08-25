import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { canMutateCollection } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (request.nextUrl.searchParams.get("status") !== "READY_TO_CONFIRM") {
    return NextResponse.json({ error: "仅支持查询待确认采集任务" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const assignments = user.role === "BD" && user.city && user.bdName
    ? await prisma.merchantAssignment.findMany({
      where: { city: user.city, bdName: user.bdName, version: { isActive: true } },
      select: { merchantId: true },
      distinct: ["merchantId"],
    })
    : [];
  const where = user.role === "BD"
    ? { status: "READY_TO_CONFIRM", merchantId: { in: assignments.map((assignment) => assignment.merchantId) } }
    : { status: "READY_TO_CONFIRM" };
  const collections = await prisma.collectionTask.findMany({
    where,
    include: { uploads: { select: { platform: true, recognitionStatus: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ collections });
}

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { city?: unknown; merchantId?: unknown; originalDeliveryFee?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "请求格式无效" }, { status: 400 }); }
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const merchantId = typeof body.merchantId === "string" ? body.merchantId.trim() : "";
  const originalDeliveryFee = body.originalDeliveryFee;
  if (!city || !merchantId || typeof originalDeliveryFee !== "number" || !Number.isFinite(originalDeliveryFee) || originalDeliveryFee < 0) {
    return NextResponse.json({ error: "请选择商家并填写有效的原价配送费" }, { status: 400 });
  }
  if (user.role !== "SUPER_ADMIN" && user.city !== city) return NextResponse.json({ error: "无权在该城市创建采集任务" }, { status: 403 });

  const now = new Date();
  const prisma = await getPrisma();
  const assignment = await prisma.merchantAssignment.findFirst({
    where: {
      city,
      merchantId,
      version: { isActive: true },
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!assignment) return NextResponse.json({ error: "未找到当前有效的商家归属" }, { status: 404 });
  if (!canMutateCollection(user, assignment)) return NextResponse.json({ error: "无权操作该商家的采集任务" }, { status: 403 });

  const collection = await prisma.collectionTask.create({
    data: {
      merchantId: assignment.merchantId,
      merchantName: assignment.merchantName,
      city: assignment.city,
      bdName: assignment.bdName,
      originalDeliveryFee,
      createdByUserId: user.id,
      status: "DRAFT",
    },
  });
  return NextResponse.json({ collection }, { status: 201 });
}
