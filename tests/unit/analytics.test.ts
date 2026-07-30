import { describe, expect, it } from "vitest";
import { merchantPriceRanking } from "../../src/lib/analytics";

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
