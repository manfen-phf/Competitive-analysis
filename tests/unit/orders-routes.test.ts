import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  user: null as null | { id: string; username: string; role: "SUPER_ADMIN" | "CITY_ADMIN" | "BD"; city: string | null; bdName: string | null },
  audit: undefined as undefined | Record<string, unknown>,
  exportWhere: undefined as undefined | Record<string, unknown>,
  record: {
    id: "order-nanning", uploadId: "upload-1", city: "南宁", bdName: "小李", merchantId: "M-2", merchantName: "南宁店", platform: "MEITUAN",
    uploadedAt: new Date("2026-08-22T10:00:00Z"), updatedAt: new Date("2026-08-22T10:00:00Z"), dishPrice: 20, packagingFee: 2, merchantActivity: 3,
    otherPromotion: 0, originalDeliveryFee: 5, deliveryFeeReduction: 1, paidDeliveryFee: 4, platformRedPacket: 0, platformRedPacketMerchantShare: 0,
    merchantSettlementAmount: 17, userPaidAmount: 22, technicalServiceFee: 1, deliveryServiceFee: 1, merchantRate: 0.1,
  },
}));

vi.mock("@/lib/auth", () => ({ getSession: async () => state.user }));
vi.mock("@/lib/db", () => ({
  getPrisma: async () => ({
    orderRecord: {
      findUnique: async () => state.record,
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        state.exportWhere = where;
        return [{ ...state.record, upload: { recognitionStatus: "SUCCEEDED" } }];
      },
      update: async ({ data }: { data: Record<string, unknown> }) => ({ ...state.record, ...data }),
    },
    orderAuditLog: { create: async ({ data }: { data: Record<string, unknown> }) => { state.audit = data; return data; } },
    $transaction: async (callback: (transaction: any) => Promise<unknown>) => callback({
      orderRecord: { update: async ({ data }: { data: Record<string, unknown> }) => ({ ...state.record, ...data }) },
      orderAuditLog: { create: async ({ data }: { data: Record<string, unknown> }) => { state.audit = data; return data; } },
    }),
  }),
}));

import { GET as listOrders } from "@/app/api/orders/route";
import { PATCH as patchOrder } from "@/app/api/orders/[id]/route";
import { GET as exportOrders } from "@/app/api/orders/export/route";

describe("data center API boundary", () => {
  beforeEach(() => { state.user = null; state.audit = undefined; state.exportWhere = undefined; });

  it("rejects BD access even when the route URL is entered directly", async () => {
    state.user = { id: "bd-1", username: "小王", role: "BD", city: "玉林", bdName: "小王" };
    const response = await listOrders(new NextRequest("http://test/api/orders"));
    expect(response.status).toBe(403);
  });

  it("rejects a city admin patching an order from another city", async () => {
    state.user = { id: "city-yulin", username: "玉林管理员", role: "CITY_ADMIN", city: "玉林", bdName: null };
    const response = await patchOrder(new NextRequest("http://test/api/orders/order-nanning", { method: "PATCH", body: JSON.stringify({ goodsTotal: 30 }) }), { params: Promise.resolve({ id: "order-nanning" }) });
    expect(response.status).toBe(403);
  });

  it("rejects a foreign-city export on the server before generating a file", async () => {
    state.user = { id: "city-yulin", username: "玉林管理员", role: "CITY_ADMIN", city: "玉林", bdName: null };
    const response = await exportOrders(new NextRequest("http://test/api/orders/export?city=南宁"));
    expect(response.status).toBe(403);
  });

  it("applies the current date-range filters before generating an export", async () => {
    state.user = { id: "super-admin", username: "总部管理员", role: "SUPER_ADMIN", city: null, bdName: null };

    const response = await exportOrders(new NextRequest("http://test/api/orders/export?start=2026-08-01&end=2026-08-02"));

    expect(response.status).toBe(200);
    expect(state.exportWhere).toMatchObject({
      uploadedAt: {
        gte: new Date("2026-08-01T00:00:00.000+08:00"),
        lte: new Date("2026-08-02T23:59:59.999+08:00"),
      },
    });
  });

  it("validates a correction, recalculates values and appends an audit record", async () => {
    state.user = { id: "city-nanning", username: "南宁管理员", role: "CITY_ADMIN", city: "南宁", bdName: null };
    const response = await patchOrder(new NextRequest("http://test/api/orders/order-nanning", { method: "PATCH", body: JSON.stringify({ goodsTotal: 30, packagingFee: 2, merchantActivity: 4, originalDeliveryFee: 5, deliveryFeeReduction: 8, technicalServiceFee: 2, deliveryServiceFee: 1 }) }), { params: Promise.resolve({ id: "order-nanning" }) });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.item).toMatchObject({ dishPrice: 28, paidDeliveryFee: 0, userPaidAmount: 29, merchantRate: 0.1 });
    expect(state.audit).toMatchObject({ orderId: "order-nanning", actorUserId: "city-nanning", actorUsername: "南宁管理员" });
  });
});
