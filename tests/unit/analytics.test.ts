import { describe, expect, it } from "vitest";
import { merchantPriceRanking, trendByPeriod, metricAverages, priceBandSummary, dimensionSummary } from "../../src/lib/analytics";

describe("merchantPriceRanking", () => {
  it("only ranks merchants with both platform records", () => {
    const result = merchantPriceRanking([
      { merchantId: "1", merchantName: "甲店", platform: "MEITUAN", userPaidAmount: 30, platformRedPacket: 2, paidDeliveryFee: 3, merchantSettlementAmount: 20 },
      { merchantId: "1", merchantName: "甲店", platform: "B_JIA", userPaidAmount: 25, platformRedPacket: 3, paidDeliveryFee: 2, merchantSettlementAmount: 19 },
      { merchantId: "2", merchantName: "乙店", platform: "MEITUAN", userPaidAmount: 40, platformRedPacket: 1, paidDeliveryFee: 4, merchantSettlementAmount: 25 },
    ]);
    expect(result).toEqual([{ merchantId: "1", merchantName: "甲店", meituanUserPaid: 30, bJiaUserPaid: 25, userPaidDifference: 5 }]);
  });
  it("groups January 1-4, 2026 into the natural first week", () => {
    const trend = trendByPeriod([
      { uploadedAt: new Date("2026-01-01T12:00:00+08:00"), platform: "MEITUAN", userPaidAmount: 30, platformRedPacket: 2, paidDeliveryFee: 3, merchantSettlementAmount: 20 },
      { uploadedAt: new Date("2026-01-04T12:00:00+08:00"), platform: "B_JIA", userPaidAmount: 25, platformRedPacket: 3, paidDeliveryFee: 2, merchantSettlementAmount: 19 },
    ], "WEEK");
    expect(trend).toMatchObject([{ label: "2026-W1", platforms: { MEITUAN: { validOrderCount: 1 }, B_JIA: { validOrderCount: 1 } } }]);
  });
});

it("averages every recognized financial field for both platforms", () => {
  const metrics = metricAverages([
    { platform: "MEITUAN", dishPrice: 40, packagingFee: 2, deliveryFeeReduction: 3, otherPromotion: 1, technicalServiceFee: 4, deliveryServiceFee: 5, merchantRate: 0.18 },
    { platform: "B_JIA", dishPrice: 36, packagingFee: 1, deliveryFeeReduction: 4, otherPromotion: 2, technicalServiceFee: 3, deliveryServiceFee: 4, merchantRate: 0.16 },
  ]);
  expect(metrics.MEITUAN.dishPrice).toBe(40);
  expect(metrics.B_JIA.deliveryFeeReduction).toBe(4);
  expect(metrics.MEITUAN.merchantRate).toBe(0.18);
});
it("groups records into the requested dish-price bands", () => {
  const bands = priceBandSummary([{ platform: "MEITUAN", dishPrice: 18, userPaidAmount: 12 }, { platform: "B_JIA", dishPrice: 22, userPaidAmount: 14 }]);
  expect(bands[0].label).toBe("0-20元");
  expect(bands[0].platforms.MEITUAN.validOrderCount).toBe(1);
  expect(bands[1].platforms.B_JIA.userPaidAmount).toBe(14);
});
it("summarizes platform counts and amounts by a dimension", () => {
 const rows = dimensionSummary([{ platform:"MEITUAN", city:"玉林市", userPaidAmount:10, platformRedPacket:2, paidDeliveryFee:1 }, { platform:"B_JIA", city:"玉林市", userPaidAmount:8, platformRedPacket:1, paidDeliveryFee:2 }], "city");
 expect(rows[0].label).toBe("玉林市"); expect(rows[0].platforms.MEITUAN.validOrderCount).toBe(1);
});