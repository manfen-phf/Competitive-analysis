import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { exportColumns, exportOrders } from "@/lib/orders";

const cityAdmin = { id: "city-admin", username: "玉林管理员", role: "CITY_ADMIN" as const, city: "玉林", bdName: null };
const superAdmin = { id: "super-admin", username: "总部管理员", role: "SUPER_ADMIN" as const, city: null, bdName: null };
const rows = [
  {
    id: "order-yulin", uploadedAt: new Date("2026-08-22T10:00:00+08:00"), city: "玉林", bdName: "小王", merchantId: "M-1", merchantName: "玉林店", platform: "MEITUAN",
    goodsTotal: 25.5, dishPrice: 23.5, packagingFee: 2, merchantActivity: 5.5, otherPromotion: 0, originalDeliveryFee: 5.5, deliveryFeeReduction: 6, paidDeliveryFee: 0,
    platformRedPacket: 1, platformRedPacketMerchantShare: 0.5, merchantSettlementAmount: 13.62, userPaidAmount: 23.5, technicalServiceFee: 3.06, deliveryServiceFee: 0, merchantRate: 0.12, recognitionStatus: "CONFIRMED",
  },
  {
    id: "order-nanning", uploadedAt: new Date("2026-08-22T10:00:00+08:00"), city: "南宁", bdName: "小李", merchantId: "M-2", merchantName: "南宁店", platform: "B_JIA",
    goodsTotal: 30, dishPrice: 28, packagingFee: 2, merchantActivity: 4, otherPromotion: 1, originalDeliveryFee: 4, deliveryFeeReduction: 1, paidDeliveryFee: 3,
    platformRedPacket: 2, platformRedPacketMerchantShare: 0, merchantSettlementAmount: 20, userPaidAmount: 28, technicalServiceFee: 2, deliveryServiceFee: 3, merchantRate: 1 / 6, recognitionStatus: "CONFIRMED",
  },
];

describe("Excel export", () => {
  it("prevents a city admin exporting another city", () => {
    const response = exportOrders({ user: cityAdmin, filters: { city: "南宁" }, rows });

    expect(response.status).toBe(403);
  });

  it("exports only the allowed city using the exact approved columns", () => {
    const response = exportOrders({ user: cityAdmin, filters: { city: "玉林" }, rows });

    expect(response.status).toBe(200);
    if (response.status !== 200) throw new Error("expected an xlsx export");
    const sheet = XLSX.read(response.workbook, { type: "buffer" }).Sheets["订单数据"];
    expect(XLSX.utils.sheet_to_json(sheet, { header: 1 })).toEqual([
      exportColumns,
      ["2026-08-22 10:00:00", "玉林", "小王", "M-1", "玉林店", "美团", 25.5, 23.5, 2, 5.5, 0, 5.5, 6, 0, 1, 0.5, 13.62, 23.5, 3.06, 0, 0.12, "已确认"],
    ]);
  });

  it("allows a super admin to export the full current result set", () => {
    const response = exportOrders({ user: superAdmin, filters: {}, rows });
    expect(response.status).toBe(200);
    if (response.status !== 200) throw new Error("expected an xlsx export");
    const sheet = XLSX.read(response.workbook, { type: "buffer" }).Sheets["订单数据"];
    expect(XLSX.utils.sheet_to_json(sheet, { header: 1 })).toHaveLength(3);
  });
});
