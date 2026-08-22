import { describe, expect, it } from "vitest";
import { buildAnalyticsSnapshot, merchantPriceRanking, type ComparableRecord } from "../../src/lib/analytics";

describe("merchantPriceRanking", () => {
  it("only ranks merchants with both platform records", () => {
    const result = merchantPriceRanking([
      { merchantId: "1", merchantName: "甲店", platform: "MEITUAN", userPaidAmount: 30, platformRedPacket: 2, paidDeliveryFee: 3, merchantSettlementAmount: 20 },
      { merchantId: "1", merchantName: "甲店", platform: "B_JIA", userPaidAmount: 25, platformRedPacket: 3, paidDeliveryFee: 2, merchantSettlementAmount: 19 },
      { merchantId: "2", merchantName: "乙店", platform: "MEITUAN", userPaidAmount: 40, platformRedPacket: 1, paidDeliveryFee: 4, merchantSettlementAmount: 25 },
    ]);
    expect(result).toEqual([{ merchantId: "1", merchantName: "甲店", meituanUserPaid: 30, bJiaUserPaid: 25, userPaidDifference: 5 }]);
  });
});

describe("buildAnalyticsSnapshot", () => {
  const rows: ComparableRecord[] = [
    { merchantId: "1", merchantName: "甲店", city: "玉林", bdName: "林晓", uploadedAt: "2026-08-18T10:00:00", platform: "MEITUAN", dishPrice: 30, packagingFee: 2, platformRedPacket: 3, otherPromotion: 0, paidDeliveryFee: 2, technicalServiceFee: 2, deliveryServiceFee: 3, merchantSettlementAmount: 20, userPaidAmount: 31, merchantRate: 0.16 },
    { merchantId: "1", merchantName: "甲店", city: "玉林", bdName: "林晓", uploadedAt: "2026-08-18T10:00:00", platform: "B_JIA", dishPrice: 32, packagingFee: 2, platformRedPacket: 4, otherPromotion: 1, paidDeliveryFee: 1, technicalServiceFee: 2, deliveryServiceFee: 3, merchantSettlementAmount: 22, userPaidAmount: 30, merchantRate: 0.15 },
  ];

  it("filters dimensions and returns all metric comparisons", () => {
    const result = buildAnalyticsSnapshot(rows, { city: "玉林", bdName: "林晓", metric: "dishPrice" });
    expect(result.totalOrders).toBe(2);
    expect(result.comparison).toHaveLength(9);
    expect(result.comparison.find((item) => item.key === "dishPrice")?.difference).toBe(-2);
    expect(result.merchantRanking[0].merchantName).toBe("甲店");
  });
});
