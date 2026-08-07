type Order = {
  orderNumber: string; platform: string; merchantId: string; merchantName: string; city: string; bdName: string;
  userPaidAmount: number; merchantSettlementAmount: number; platformRedPacket: number; paidDeliveryFee: number;
};

type UploadRecord = { id: string; uploadedAt: Date; imageAccessToken: string; order: Order | null; failure: { reason: string } | null };

export function toRecordListItem(upload: UploadRecord) {
  const order = upload.order;
  return {
    id: upload.id,
    uploadedAt: upload.uploadedAt,
    status: order ? "SUCCESS" : "FAILED",
    reason: order ? null : upload.failure?.reason ?? "识别失败",
    imageUrl: `/api/uploads/${upload.id}/image?token=${upload.imageAccessToken}`,
    orderNumber: order?.orderNumber ?? null,
    platform: order?.platform ?? null,
    merchantId: order?.merchantId ?? null,
    merchantName: order?.merchantName ?? null,
    city: order?.city ?? null,
    bdName: order?.bdName ?? null,
    userPaidAmount: order?.userPaidAmount ?? null,
    merchantSettlementAmount: order?.merchantSettlementAmount ?? null,
    platformRedPacket: order?.platformRedPacket ?? null,
    paidDeliveryFee: order?.paidDeliveryFee ?? null,
  };
}