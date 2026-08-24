import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { exportOrders } from "@/lib/orders";
import { canManageDataCenter } from "@/lib/permissions";

function dateAtBoundary(value: string | null, boundary: "start" | "end") {
  if (!value) return undefined;
  const date = new Date(`${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}+08:00`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (!canManageDataCenter(user)) return NextResponse.json({ error: "无权导出数据中心订单" }, { status: 403 });
  const params = request.nextUrl.searchParams;
  const start = dateAtBoundary(params.get("start"), "start");
  const end = dateAtBoundary(params.get("end"), "end");
  if (start === null || end === null) return NextResponse.json({ error: "日期格式无效" }, { status: 400 });
  const requestedCity = params.get("city") || undefined;
  if (user.role === "CITY_ADMIN" && requestedCity && requestedCity !== user.city) return NextResponse.json({ error: "城市管理员只能导出本城市数据" }, { status: 403 });
  const city = user.role === "CITY_ADMIN" ? user.city ?? undefined : requestedCity;
  const bdName = params.get("bd") || undefined;
  const merchantId = params.get("merchant") || undefined;
  const platform = params.get("platform") || undefined;
  const recognitionStatus = params.get("recognitionStatus") || undefined;
  const query = params.get("q")?.trim() || undefined;
  const prisma = await getPrisma();
  const records = await prisma.orderRecord.findMany({
    where: {
      ...(city ? { city } : {}), ...(bdName ? { bdName } : {}), ...(merchantId ? { merchantId } : {}), ...(platform ? { platform } : {}),
      ...(start || end ? { uploadedAt: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } } : {}),
      ...(recognitionStatus ? { upload: { recognitionStatus } } : {}),
      ...(query ? { OR: [{ merchantId: { contains: query } }, { merchantName: { contains: query } }, { bdName: { contains: query } }, { city: { contains: query } }] } : {}),
    },
    include: { upload: { select: { recognitionStatus: true } } },
    orderBy: { uploadedAt: "desc" },
  });
  const result = exportOrders({
    user,
    filters: { city },
    rows: records.map((record) => ({
      ...record,
      goodsTotal: record.dishPrice + record.packagingFee,
      merchantActivity: record.merchantActivity,
      recognitionStatus: record.upload.recognitionStatus === "SUCCEEDED" ? "CONFIRMED" : record.upload.recognitionStatus,
    })),
  });
  if (result.status !== 200) return NextResponse.json({ error: "无权导出所选数据" }, { status: 403 });
  return new NextResponse(result.workbook, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("订单数据导出.xlsx")}`,
      "Cache-Control": "private, no-store",
    },
  });
}
