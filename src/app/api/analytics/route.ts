import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { averageByPlatform, merchantPriceRanking } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  const prisma = await getPrisma();
  const city = request.nextUrl.searchParams.get("city") || undefined;
  const bdName = request.nextUrl.searchParams.get("bd") || undefined;
  const merchantId = request.nextUrl.searchParams.get("merchantId") || undefined;
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  const startDate = start ? new Date(`${start}T00:00:00+08:00`) : undefined;
  const endDate = end ? new Date(`${end}T23:59:59.999+08:00`) : undefined;
  if ((startDate && Number.isNaN(startDate.valueOf())) || (endDate && Number.isNaN(endDate.valueOf()))) return NextResponse.json({ error: "日期格式无效" }, { status: 400 });
  const rows = await prisma.orderRecord.findMany({ where: { city, bdName, merchantId, ...(startDate || endDate ? { uploadedAt: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } } : {}) }, select: { platform:true, merchantId:true, merchantName:true, userPaidAmount:true, platformRedPacket:true, paidDeliveryFee:true, merchantSettlementAmount:true } });
  const platforms = averageByPlatform(rows as Parameters<typeof averageByPlatform>[0]);
  return NextResponse.json({ platforms, userPaidDifference: platforms.MEITUAN.userPaidAmount - platforms.B_JIA.userPaidAmount, merchantRanking: merchantPriceRanking(rows as Parameters<typeof merchantPriceRanking>[0]).slice(0, 20) });
}
