import { describe, expect, it } from "vitest";

import { buildOverviewSnapshot } from "@/lib/overview";

describe("buildOverviewSnapshot", () => {
  it("returns scoped collection counts, confirmation queue and attention merchants", () => {
    const snapshot = buildOverviewSnapshot({
      collections: [
        { id: "c-1", merchantId: "m-1", merchantName: "玉林一店", city: "玉林", bdName: "小王", status: "READY_TO_CONFIRM", createdAt: "2026-08-25T02:00:00.000Z", uploads: [{ platform: "MEITUAN", recognitionStatus: "SUCCEEDED" }, { platform: "B_JIA", recognitionStatus: "SUCCEEDED" }] },
        { id: "c-2", merchantId: "m-2", merchantName: "玉林二店", city: "玉林", bdName: "小王", status: "FAILED", createdAt: "2026-08-25T01:00:00.000Z", uploads: [{ platform: "MEITUAN", recognitionStatus: "FAILED" }] },
        { id: "c-3", merchantId: "m-3", merchantName: "南宁店", city: "南宁", bdName: "小李", status: "CONFIRMED", createdAt: "2026-08-24T01:00:00.000Z", uploads: [] },
      ],
      orders: [
        { merchantId: "m-1", merchantName: "玉林一店", city: "玉林", bdName: "小王", platform: "MEITUAN", userPaidAmount: 32, uploadedAt: "2026-08-25T02:00:00.000Z", dishPrice: 30, packagingFee: 0, platformRedPacket: 0, otherPromotion: 0, paidDeliveryFee: 0, merchantSettlementAmount: 0, technicalServiceFee: 0, deliveryServiceFee: 0, merchantRate: 0 },
        { merchantId: "m-1", merchantName: "玉林一店", city: "玉林", bdName: "小王", platform: "B_JIA", userPaidAmount: 27, uploadedAt: "2026-08-25T02:00:00.000Z", dishPrice: 30, packagingFee: 0, platformRedPacket: 0, otherPromotion: 0, paidDeliveryFee: 0, merchantSettlementAmount: 0, technicalServiceFee: 0, deliveryServiceFee: 0, merchantRate: 0 },
      ],
      now: new Date("2026-08-25T12:00:00.000Z"),
    });

    expect(snapshot).toMatchObject({
      todayMerchantCount: 2,
      capturedOrderCount: 3,
      pendingConfirmationCount: 1,
      failedRecognitionCount: 1,
    });
    expect(snapshot.latestCollections).toHaveLength(3);
    expect(snapshot.attentionMerchants).toEqual([expect.objectContaining({ merchantId: "m-1", userPaidGap: 5 })]);
  });
});
