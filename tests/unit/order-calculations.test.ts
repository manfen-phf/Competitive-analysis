import { describe, expect, it } from "vitest";
import { calculateOrderDerivedValues } from "@/lib/order-calculations";

describe("calculateOrderDerivedValues", () => {
  it("never returns a negative paid delivery fee", () => {
    expect(calculateOrderDerivedValues({
      goodsTotal: 25.5,
      packagingFee: 2,
      merchantActivity: 5.5,
      originalDeliveryFee: 5.5,
      deliveryFeeReduction: 6,
    })).toMatchObject({
      dishPrice: 23.5,
      paidDeliveryFee: 0,
      userPaidAmount: 23.5,
    });
  });

  it("uses goods total as dish price when packaging fee is absent", () => {
    expect(calculateOrderDerivedValues({
      goodsTotal: 25.5,
      originalDeliveryFee: 5.5,
    }).dishPrice).toBe(25.5);
  });

  it("calculates the merchant rate from technical and delivery fees", () => {
    expect(calculateOrderDerivedValues({
      goodsTotal: 50,
      originalDeliveryFee: 4,
      technicalServiceFee: 3,
      deliveryServiceFee: 2,
    }).merchantRate).toBe(0.1);
  });
});
