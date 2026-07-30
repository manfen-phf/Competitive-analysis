import { describe, expect, it } from "vitest";
import { validateRecognition } from "../../src/lib/validation";

const validPayload = {
  platform: "MEITUAN", orderNumber: "A-001", dishPrice: 50, packagingFee: 2,
  platformRedPacket: 5, originalDeliveryFee: 6, deliveryFeeReduction: 2,
  paidDeliveryFee: 4, merchantSettlementAmount: 35, userPaidAmount: 51,
  otherPromotion: 0, technicalServiceFee: 3, deliveryServiceFee: 4,
  merchantRate: 0.06, confidence: 0.95,
};

describe("validateRecognition", () => {
  it("accepts a complete consistent recognition", () => {
    expect(validateRecognition(validPayload).ok).toBe(true);
  });

  it("rejects a missing mandatory field", () => {
    expect(validateRecognition({ ...validPayload, userPaidAmount: null }).ok).toBe(false);
  });

  it("rejects inconsistent delivery fees", () => {
    expect(validateRecognition({ ...validPayload, paidDeliveryFee: 3 }).ok).toBe(false);
  });
});
