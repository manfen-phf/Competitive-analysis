import { describe, expect, it } from "vitest";

import { canExportOrders, canManageDataCenter, canMutateOrder, canReadOrder } from "@/lib/permissions";
import { sanitizeOrderPatch } from "@/lib/orders";

const superAdmin = { role: "SUPER_ADMIN" as const, city: null, bdName: null };
const yulinAdmin = { role: "CITY_ADMIN" as const, city: "玉林", bdName: null };
const nanningOrder = { city: "南宁", bdName: "小李" };
const yulinOrder = { city: "玉林", bdName: "小王" };

describe("data center permissions", () => {
  it("keeps the data center unavailable to BD accounts", () => {
    const bd = { role: "BD" as const, city: "玉林", bdName: "小王" };

    expect(canManageDataCenter(bd)).toBe(false);
    expect(canReadOrder(bd, yulinOrder)).toBe(true);
  });

  it("allows a city admin to read another city but not mutate it", () => {
    expect(canReadOrder(yulinAdmin, nanningOrder)).toBe(true);
    expect(canMutateOrder(yulinAdmin, nanningOrder)).toBe(false);
  });

  it("allows a city admin to export only their assigned city", () => {
    expect(canExportOrders(yulinAdmin, "玉林")).toBe(true);
    expect(canExportOrders(yulinAdmin, "南宁")).toBe(false);
    expect(canExportOrders(superAdmin, "南宁")).toBe(true);
  });
});

describe("order correction validation", () => {
  it("rejects server-controlled scope fields and recalculates all derived values", () => {
    const result = sanitizeOrderPatch({
      goodsTotal: 25.5,
      packagingFee: 2,
      merchantActivity: 5.5,
      originalDeliveryFee: 5.5,
      deliveryFeeReduction: 6,
      technicalServiceFee: 1,
      deliveryServiceFee: 2,
      city: "南宁",
      merchantId: "merchant-other-city",
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        dishPrice: 23.5,
        paidDeliveryFee: 0,
        userPaidAmount: 23.5,
        merchantRate: 3 / 25.5,
      },
    });
    expect(result.ok && result.data).not.toHaveProperty("city");
    expect(result.ok && result.data).not.toHaveProperty("merchantId");
  });

  it("rejects a correction without the required goods total", () => {
    expect(sanitizeOrderPatch({ packagingFee: 2 })).toEqual({ ok: false, error: "商品总价必须是有效的非负金额" });
  });
});
