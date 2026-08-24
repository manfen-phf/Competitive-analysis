import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { sanitizeOrderPatch } from "@/lib/orders";
import { canManageDataCenter, canMutateOrder, canReadOrder } from "@/lib/permissions";
import { publicUploadImageUrl } from "@/lib/storage";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (!canManageDataCenter(user)) return NextResponse.json({ error: "无权访问数据中心" }, { status: 403 });
  const { id } = await context.params;
  const prisma = await getPrisma();
  const record = await prisma.orderRecord.findUnique({
    where: { id },
    include: {
      upload: { select: { id: true, imageAccessToken: true, imageMimeType: true, recognitionStatus: true } },
      audits: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!record || !canReadOrder(user, record)) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  const imageUrl = publicUploadImageUrl(request.nextUrl.origin, record.upload.id, record.upload.imageAccessToken);
  return NextResponse.json({ item: { ...record, goodsTotal: record.dishPrice + record.packagingFee, imageUrl } });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (!canManageDataCenter(user)) return NextResponse.json({ error: "无权修改数据中心订单" }, { status: 403 });
  const { id } = await context.params;
  const prisma = await getPrisma();
  const record = await prisma.orderRecord.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  if (!canMutateOrder(user, record)) return NextResponse.json({ error: "无权修改其他城市订单" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const candidate = {
    goodsTotal: record.dishPrice + record.packagingFee,
    packagingFee: record.packagingFee,
    merchantActivity: record.merchantActivity,
    otherPromotion: record.otherPromotion,
    originalDeliveryFee: record.originalDeliveryFee,
    deliveryFeeReduction: record.deliveryFeeReduction,
    platformRedPacket: record.platformRedPacket,
    platformRedPacketMerchantShare: record.platformRedPacketMerchantShare,
    merchantSettlementAmount: record.merchantSettlementAmount,
    technicalServiceFee: record.technicalServiceFee,
    deliveryServiceFee: record.deliveryServiceFee,
    ...(body && typeof body === "object" ? body : {}),
  };
  const sanitized = sanitizeOrderPatch(candidate);
  if (!sanitized.ok) return NextResponse.json({ error: sanitized.error }, { status: 400 });

  const beforeJson = JSON.stringify(record);
  const updateData = { ...sanitized.data, updatedAt: new Date() };
  const updated = await prisma.$transaction(async (transaction) => {
    const updatedOrder = await transaction.orderRecord.update({ where: { id }, data: updateData });
    await transaction.orderAuditLog.create({
      data: {
        orderId: id,
        actorUserId: user.id,
        actorUsername: user.username,
        beforeJson,
        afterJson: JSON.stringify(updatedOrder),
      },
    });
    return updatedOrder;
  });
  return NextResponse.json({ item: { ...updated, goodsTotal: updated.dishPrice + updated.packagingFee } });
}
