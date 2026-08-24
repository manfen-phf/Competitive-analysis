import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { canManageDataCenter, canReadOrder } from "@/lib/permissions";

function dateAtBoundary(value: string | null, boundary: "start" | "end") {
  if (!value) return undefined;
  const date = new Date(`${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}+08:00`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function positiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

/** Administrator-only query endpoint.  The browser may hide the route, but this gate is the real boundary. */
export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (!canManageDataCenter(user)) return NextResponse.json({ error: "无权访问数据中心" }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const start = dateAtBoundary(params.get("start"), "start");
  const end = dateAtBoundary(params.get("end"), "end");
  if (start === null || end === null) return NextResponse.json({ error: "日期格式无效" }, { status: 400 });
  const page = positiveInteger(params.get("page"), 1, 100000);
  const pageSize = positiveInteger(params.get("pageSize"), 20, 100);
  const city = params.get("city") || undefined;
  const bdName = params.get("bd") || undefined;
  const merchant = params.get("merchant") || undefined;
  const platform = params.get("platform") || undefined;
  const recognitionStatus = params.get("recognitionStatus") || undefined;
  const query = params.get("q")?.trim() || undefined;

  const where = {
    ...(city ? { city } : {}),
    ...(bdName ? { bdName } : {}),
    ...(merchant ? { merchantId: merchant } : {}),
    ...(platform ? { platform } : {}),
    ...(start || end ? { uploadedAt: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } } : {}),
    ...(recognitionStatus ? { upload: { recognitionStatus } } : {}),
    ...(query ? { OR: [{ merchantId: { contains: query } }, { merchantName: { contains: query } }, { bdName: { contains: query } }, { city: { contains: query } }] } : {}),
  };

  const prisma = await getPrisma();
  const [total, records] = await Promise.all([
    prisma.orderRecord.count({ where }),
    prisma.orderRecord.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { upload: { select: { id: true, imageAccessToken: true, imageMimeType: true, recognitionStatus: true } } },
    }),
  ]);

  const visible = records.filter((record) => canReadOrder(user, record)).map((record) => ({
    ...record,
    goodsTotal: record.dishPrice + record.packagingFee,
  }));
  return NextResponse.json({ items: visible, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}
