import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { buildOverviewSnapshot } from "@/lib/overview";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const prisma = await getPrisma();
  const collectionWhere = user.role === "BD" ? { city: user.city ?? "", bdName: user.bdName ?? "" } : {};
  const orderWhere = user.role === "BD"
    ? { city: user.city ?? "", bdName: user.bdName ?? "", upload: { collection: { status: "CONFIRMED" } } }
    : { upload: { collection: { status: "CONFIRMED" } } };
  const [collections, orders] = await Promise.all([
    prisma.collectionTask.findMany({
      where: collectionWhere,
      include: { uploads: { select: { platform: true, recognitionStatus: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.orderRecord.findMany({
      where: orderWhere,
      select: {
        platform: true, merchantId: true, merchantName: true, city: true, bdName: true, uploadedAt: true,
        dishPrice: true, packagingFee: true, platformRedPacket: true, otherPromotion: true,
        paidDeliveryFee: true, technicalServiceFee: true, deliveryServiceFee: true,
        merchantSettlementAmount: true, userPaidAmount: true, merchantRate: true,
      },
    }),
  ]);

  return NextResponse.json(buildOverviewSnapshot({
    collections,
    orders: orders.map((order) => ({ ...order, platform: order.platform as "MEITUAN" | "B_JIA" })),
  }));
}
