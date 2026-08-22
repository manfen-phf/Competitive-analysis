import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { confirmCollection } from "@/lib/collection-confirmation";
import { canMutateCollection } from "@/lib/permissions";
import { validateRecognitionPlatform } from "@/lib/validation";

const routeState = vi.hoisted(() => ({
  user: null as null | { id: string; username: string; role: "SUPER_ADMIN" | "CITY_ADMIN" | "BD"; city: string | null; bdName: string | null },
  assignment: undefined as undefined | { merchantId: string; merchantName: string; city: string; bdName: string },
  collection: undefined as undefined | ReturnType<typeof collection>,
  created: undefined as undefined | Record<string, unknown>,
  uploaded: undefined as undefined | Record<string, unknown>,
  existingUpload: undefined as undefined | { id: string; imageFileId: string; storageReference: string | null; imageMimeType: string; imageHash: string; platform: string | null; uploadedAt: Date; collection: { merchantName: string } },
}));

vi.mock("@/lib/auth", () => ({ getSession: async () => routeState.user }));
vi.mock("@/lib/db", () => ({
  getPrisma: async () => ({
    merchantAssignment: { findFirst: async () => routeState.assignment },
    collectionTask: {
      create: async ({ data }: { data: Record<string, unknown> }) => { routeState.created = data; return { id: "collection-new", ...data }; },
      findUnique: async () => routeState.collection,
    },
    upload: {
      findFirst: async () => routeState.existingUpload,
      create: async ({ data }: { data: Record<string, unknown> }) => { routeState.uploaded = data; return { id: "upload-new", ...data }; },
    },
    imageHashReservation: { create: async () => { if (routeState.existingUpload) throw new Error("duplicate"); }, delete: async () => undefined },
  }),
}));

import { POST as createCollection } from "@/app/api/collections/route";
import { POST as confirmCollectionRoute } from "@/app/api/collections/[id]/confirm/route";
import { POST as uploadCollectionImage } from "@/app/api/collections/[id]/images/route";
import { GET as listMerchants } from "@/app/api/merchants/route";

const bdUser = { id: "bd-1", username: "张三", role: "BD" as const, city: "玉林", bdName: "张三" };

function collection(images = [
  { id: "image-mt", platform: "MEITUAN", recognitionStatus: "SUCCEEDED", uploadedAt: new Date("2026-08-22T08:00:00Z"), recognitionResult: JSON.stringify({ dishPrice: 20, packagingFee: 2 }) },
  { id: "image-bj", platform: "B_JIA", recognitionStatus: "SUCCEEDED", uploadedAt: new Date("2026-08-22T08:01:00Z"), recognitionResult: JSON.stringify({ dishPrice: 30, packagingFee: 0 }) },
]) {
  return {
    id: "collection-1", merchantId: "merchant-1", merchantName: "茶百道", city: "玉林", bdName: "张三", originalDeliveryFee: 5, status: "READY_TO_CONFIRM", uploads: images,
  };
}

function reviews() {
  return [
    { platform: "MEITUAN" as const, goodsTotal: 22, packagingFee: 2, merchantActivity: 3, deliveryFeeReduction: 8, platformRedPacket: 1, merchantSettlementAmount: 17, otherPromotion: 0, technicalServiceFee: 1, deliveryServiceFee: 1 },
    { platform: "B_JIA" as const, goodsTotal: 30, packagingFee: 0, merchantActivity: 2, deliveryFeeReduction: 1, platformRedPacket: 0, merchantSettlementAmount: 25, otherPromotion: 0, technicalServiceFee: 2, deliveryServiceFee: 1 },
  ];
}

function database() {
  const state = { orders: [] as Record<string, unknown>[], status: "READY_TO_CONFIRM" };
  const tx = {
    orderRecord: { create: async ({ data }: { data: Record<string, unknown> }) => { state.orders.push(data); return data; }, count: async () => state.orders.length },
    collectionTask: { updateMany: async ({ data }: { data: { status: string } }) => { state.status = data.status; return { count: 1 }; }, findUnique: async () => ({ status: state.status }) },
  };
  return { state, $transaction: async <T>(callback: (transaction: typeof tx) => Promise<T>) => callback(tx) };
}

describe("paired collection confirmation", () => {
  beforeEach(() => {
    routeState.user = { ...bdUser };
    routeState.assignment = { merchantId: "merchant-1", merchantName: "茶百道", city: "玉林", bdName: "张三" };
    routeState.collection = collection();
    routeState.created = undefined;
    routeState.uploaded = undefined;
    routeState.existingUpload = undefined;
  });

  it("prevents a BD from creating a collection for another BD's merchant", async () => {
    routeState.assignment = { merchantId: "merchant-1", merchantName: "茶百道", city: "玉林", bdName: "李四" };

    const response = await createCollection(new Request("http://test/api/collections", {
      method: "POST", body: JSON.stringify({ city: "玉林", merchantId: "merchant-1", originalDeliveryFee: 5 }),
    }) as never);

    expect(response.status).toBe(403);
    expect(routeState.created).toBeUndefined();
  });

  it("does not expose merchants from another city to a BD through the selection API", async () => {
    const response = await listMerchants(new NextRequest("http://test/api/merchants?city=南宁&demo=0"));
    expect(response.status).toBe(403);
  });

  it("persists the assignment-derived BD and shared original delivery fee", async () => {
    const response = await createCollection(new Request("http://test/api/collections", {
      method: "POST", body: JSON.stringify({ city: "玉林", merchantId: "merchant-1", originalDeliveryFee: 5.5 }),
    }) as never);

    expect(response.status).toBe(201);
    expect(routeState.created).toMatchObject({ merchantId: "merchant-1", merchantName: "茶百道", city: "玉林", bdName: "张三", originalDeliveryFee: 5.5, createdByUserId: "bd-1", status: "DRAFT" });
  });

  it("does not let a BD confirm another BD's collection through the API", async () => {
    routeState.collection = { ...collection(), bdName: "李四" };
    const response = await confirmCollectionRoute(new Request("http://test/api/collections/collection-1/confirm", {
      method: "POST", body: JSON.stringify({ reviews: reviews() }),
    }) as never, { params: Promise.resolve({ id: "collection-1" }) });

    expect(response.status).toBe(403);
  });

  it("records a visible duplicate status without attaching the original image to the new collection", async () => {
    routeState.existingUpload = {
      id: "existing-upload", imageFileId: "cloud://image", storageReference: "cloud://image", imageMimeType: "image/png", imageHash: "a".repeat(64), platform: "MEITUAN", uploadedAt: new Date("2026-08-22T08:00:00Z"),
      collection: { merchantName: "其他商家" },
    };
    const form = new FormData();
    form.set("platform", "MEITUAN");
    form.set("file", new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), "order.png");
    const response = await uploadCollectionImage(new Request("http://test/api/collections/collection-1/images", { method: "POST", body: form }) as never, { params: Promise.resolve({ id: "collection-1" }) });

    expect(response.status).toBe(409);
    expect(routeState.uploaded).toBeUndefined();
  });

  it("rejects confirmation unless both platform images are recognized", async () => {
    const response = await confirmCollection({
      collection: collection([{ id: "image-mt", platform: "MEITUAN", recognitionStatus: "SUCCEEDED", uploadedAt: new Date("2026-08-22T08:00:00Z"), recognitionResult: JSON.stringify({ dishPrice: 20, packagingFee: 2 }) }]),
      user: bdUser,
      reviews: reviews(),
      database: database(),
    });

    expect(response).toMatchObject({ ok: false, error: "请先完成美团和B家两张截图的识别" });
  });

  it("rejects an OCR result labelled as the other platform", () => {
    expect(validateRecognitionPlatform("MEITUAN", "B_JIA")).toEqual({ ok: false, reason: "截图识别平台与所选平台不一致" });
  });

  it("returns a stable success for a repeated confirmed collection", async () => {
    const db = database();
    const response = await confirmCollection({ collection: { ...collection(), status: "CONFIRMED" }, user: bdUser, reviews: reviews(), database: db });
    expect(response).toMatchObject({ ok: true, orderCount: 2, alreadyConfirmed: true });
    expect(db.state.orders).toHaveLength(0);
  });

  it("rejects a BD editing another BD collection", async () => {
    expect(canMutateCollection(bdUser, { bdName: "李四", city: "玉林" })).toBe(false);

    const response = await confirmCollection({ collection: { ...collection(), bdName: "李四" }, user: bdUser, reviews: reviews(), database: database() });
    expect(response).toMatchObject({ ok: false, error: "无权操作此采集任务" });
  });

  it("recalculates editable fields on the server and confirms both platform orders in one transaction", async () => {
    const db = database();
    const response = await confirmCollection({ collection: collection(), user: bdUser, reviews: reviews(), database: db });

    expect(response).toMatchObject({ ok: true, orderCount: 2 });
    expect(db.state.status).toBe("CONFIRMED");
    expect(db.state.orders).toEqual(expect.arrayContaining([
      expect.objectContaining({ platform: "MEITUAN", uploadId: "image-mt", uploadedAt: new Date("2026-08-22T08:00:00Z"), platformRedPacketMerchantShare: 0, dishPrice: 20, paidDeliveryFee: 0, userPaidAmount: 22, merchantRate: 2 / 22 }),
      expect.objectContaining({ platform: "B_JIA", uploadId: "image-bj", uploadedAt: new Date("2026-08-22T08:01:00Z"), platformRedPacketMerchantShare: 0, dishPrice: 30, paidDeliveryFee: 4, userPaidAmount: 33, merchantRate: 0.1 }),
    ]));
  });
});
