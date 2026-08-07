import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { averageByPlatform, dimensionSummary, merchantPriceRanking, metricAverages, priceBandSummary, trendByPeriod, type TrendPeriod } from "@/lib/analytics";

const periods = ["DAY", "WEEK", "MONTH", "YEAR"] as const;

export async function GET(request: NextRequest) {
  const prisma = await getPrisma();
  const city = request.nextUrl.searchParams.get("city") || undefined;
  const bdName = request.nextUrl.searchParams.get("bd") || undefined;
  const merchantId = request.nextUrl.searchParams.get("merchantId") || undefined;
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  const requestedPeriod = request.nextUrl.searchParams.get("period");
  const period: TrendPeriod = periods.includes(requestedPeriod as TrendPeriod) ? requestedPeriod as TrendPeriod : "DAY";
  const startDate = start ? new Date(`${start}T00:00:00+08:00`) : undefined;
  const endDate = end ? new Date(`${end}T23:59:59.999+08:00`) : undefined;

  if ((startDate && Number.isNaN(startDate.valueOf())) || (endDate && Number.isNaN(endDate.valueOf()))) {
    return NextResponse.json({ error: "\u65e5\u671f\u683c\u5f0f\u65e0\u6548" }, { status: 400 });
  }

  const rows = await prisma.orderRecord.findMany({
    where: {
      city,
      bdName,
      merchantId,
      ...(startDate || endDate ? { uploadedAt: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } } : {}),
    },
    select: {
      platform: true,
      merchantId: true,
      merchantName: true,
      userPaidAmount: true,
      platformRedPacket: true,
      paidDeliveryFee: true,
      merchantSettlementAmount: true,
      uploadedAt: true,
      dishPrice: true, packagingFee: true, originalDeliveryFee: true, deliveryFeeReduction: true, otherPromotion: true, technicalServiceFee: true, deliveryServiceFee: true, merchantRate: true,
    },
  });

  const platforms = averageByPlatform(rows as Parameters<typeof averageByPlatform>[0]);
  return NextResponse.json({
    platforms,
    userPaidDifference: platforms.MEITUAN.userPaidAmount - platforms.B_JIA.userPaidAmount,
    merchantRanking: merchantPriceRanking(rows as Parameters<typeof merchantPriceRanking>[0]).slice(0, 20),
    trend: trendByPeriod(rows as Parameters<typeof trendByPeriod>[0], period),
    metrics: metricAverages(rows as Parameters<typeof metricAverages>[0]),
    priceBands: priceBandSummary(rows as Parameters<typeof priceBandSummary>[0]),
    bdSummary: dimensionSummary(rows as Parameters<typeof dimensionSummary>[0], "bdName"),
    citySummary: dimensionSummary(rows as Parameters<typeof dimensionSummary>[0], "city"),
  });
}