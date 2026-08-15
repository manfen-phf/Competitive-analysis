import { describe, expect, it } from "vitest";
import { normalizeRecognitionResult } from "@/lib/validation";

describe("flexible order recognition", () => {
  it("keeps omitted screenshot fields empty while using goods total as the only required value", () => {
    const result = normalizeRecognitionResult({ platform: "MEITUAN", goodsTotal: 25.5 }, 6);

    expect(result.packagingFee).toBeNull();
    expect(result.merchantActivityAmount).toBeNull();
    expect(result.dishPrice).toBe(25.5);
    expect(result.originalDeliveryFee).toBe(6);
    expect(result.userPaidAmount).toBeNull();
    expect(result.merchantRate).toBeNull();
  });

  it("calculates derived values from the selected merchant delivery fee", () => {
    const result = normalizeRecognitionResult({
      platform: "B_JIA",
      goodsTotal: 42.04,
      packagingFee: 2,
      merchantActivityAmount: 14.95,
      deliveryFeeReduction: 4.6,
      technicalServiceFee: 3.21,
      deliveryServiceFee: 4.11,
    }, 5);

    expect(result.dishPrice).toBe(40.04);
    expect(result.paidDeliveryFee).toBe(0.4);
    expect(result.userPaidAmount).toBe(32.09);
    expect(result.merchantRate).toBeCloseTo(17.41, 2);
  });

  it("never allows the calculated paid delivery fee to fall below zero", () => {
    const result = normalizeRecognitionResult({
      platform: "MEITUAN",
      goodsTotal: 25.5,
      deliveryFeeReduction: 6,
    }, 5.5);

    expect(result.paidDeliveryFee).toBe(0);
  });

  it("keeps B 家店铺满减 as an independent other activity breakdown", () => {
    const result = normalizeRecognitionResult({
      platform: "B_JIA",
      goodsTotal: 67.8,
      merchantActivityAmount: 22,
      otherActivityAmount: 3,
      platformRedPacketMerchantShare: 15,
      deliveryFeeReduction: 4,
    }, 5);

    expect(result.merchantActivityAmount).toBe(22);
    expect(result.otherActivityAmount).toBe(3);
    expect(result.userPaidAmount).toBe(50.8);
  });

  it("rejects recognition data without a goods total", () => {
    expect(() => normalizeRecognitionResult({ platform: "MEITUAN" }, 0)).toThrow();
  });
});
