import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { buildAnalyticsSnapshot, filterOrdersForUser, metricLabels, type ComparableRecord, type MetricKey, type PeriodKey } from "@/lib/analytics";
import { getPrisma } from "@/lib/db";
import { DEMO_RECORDS } from "@/lib/demo-data";

const periods = new Set<PeriodKey>(["DAY", "WEEK", "MONTH", "YEAR"]);
const metrics = new Set<MetricKey>(Object.keys(metricLabels) as MetricKey[]);

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const requestedCity = params.get("city") || undefined;
  const requestedBdName = params.get("bd") || undefined;
  const merchantId = params.get("merchantId") || undefined;
  const start = params.get("start") || undefined;
  const end = params.get("end") || undefined;
  const period = (params.get("period") || "DAY") as PeriodKey;
  const metric = (params.get("metric") || "userPaidAmount") as MetricKey;
  const demo = params.get("demo") !== "0";

  if (!periods.has(period) || !metrics.has(metric)) return NextResponse.json({ error: "筛选条件无效" }, { status: 400 });
  if ((start && Number.isNaN(new Date(`${start}T00:00:00+08:00`).valueOf())) || (end && Number.isNaN(new Date(`${end}T23:59:59.999+08:00`).valueOf()))) return NextResponse.json({ error: "日期格式无效" }, { status: 400 });
  if (user.role === "BD" && requestedCity && requestedCity !== user.city) return NextResponse.json({ error: "无权查看该城市数据" }, { status: 403 });
  if (user.role === "BD" && requestedBdName && requestedBdName !== user.bdName) return NextResponse.json({ error: "无权查看其他 BD 数据" }, { status: 403 });

  const city = user.role === "BD" ? user.city ?? undefined : requestedCity;
  const bdName = user.role === "BD" ? user.bdName ?? undefined : requestedBdName;
  const startDate = start ? new Date(`${start}T00:00:00+08:00`) : undefined;
  const endDate = end ? new Date(`${end}T23:59:59.999+08:00`) : undefined;
  let realRows: ComparableRecord[] = [];

  try {
    const prisma = await getPrisma();
    const [rows, assignments] = await Promise.all([
      prisma.orderRecord.findMany({
        where: {
          upload: { collection: { status: "CONFIRMED" } },
          ...(city ? { city } : {}),
          ...(bdName ? { bdName } : {}),
          ...(merchantId ? { merchantId } : {}),
          ...(startDate || endDate ? { uploadedAt: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } } : {}),
        },
        select: { platform: true, merchantId: true, merchantName: true, city: true, bdName: true, uploadedAt: true, dishPrice: true, packagingFee: true, platformRedPacket: true, otherPromotion: true, paidDeliveryFee: true, technicalServiceFee: true, deliveryServiceFee: true, merchantSettlementAmount: true, userPaidAmount: true, merchantRate: true },
      }),
      user.role === "BD" && user.city && user.bdName
        ? prisma.merchantAssignment.findMany({ where: { city: user.city, bdName: user.bdName, version: { isActive: true } }, select: { merchantId: true }, distinct: ["merchantId"] })
        : Promise.resolve([]),
    ]);
    const assignedMerchantIds = new Set(assignments.map((assignment) => assignment.merchantId));
    realRows = rows.map((row) => ({ ...row, platform: row.platform as ComparableRecord["platform"] })).filter((row) => user.role !== "BD" || assignedMerchantIds.has(row.merchantId));
  } catch {
    // The page keeps an explicitly-labelled demonstration mode for an unconfigured local database.
  }

  const records = demo ? [...filterOrdersForUser(user, DEMO_RECORDS), ...realRows] : realRows;
  return NextResponse.json({ ...buildAnalyticsSnapshot(records, { period, metric, city, bdName, merchantId, start, end }), demo, realOrderCount: realRows.length });
}
