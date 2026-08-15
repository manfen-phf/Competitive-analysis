import { describe, expect, it } from "vitest";
import { createBdSessionValue } from "@/lib/bd-session";
import { handleBdMerchantsGet, handleBdSessionPost, handleCollectionPost } from "@/lib/bd-api";

function database(rows: Record<string, unknown[]> = {}) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  return {
    calls,
    prepare(sql: string) {
      const statement = {
        bind(...values: unknown[]) { calls.push({ sql, values }); return statement; },
        all: async <T>() => ({ results: (sql.includes('"UserAccount"') ? (rows.users ?? []) : sql.includes('"Merchant"') ? (rows.merchants ?? []) : sql.includes('"MerchantBdAssignment"') ? (rows.assignment ?? [{ assigned: 1 }]) : (rows.duplicates ?? [])) as T[] }),
      };
      return statement;
    },
    batch: async () => [],
  };
}

describe("BD collection API", () => {
  it("creates a signed browser session only for an active imported BD", async () => {
    const db = database({ users: [{ id: "bd:刘英安", displayName: "刘英安" }] });
    const response = await handleBdSessionPost(new Request("http://localhost/api/bd/session", {
      method: "POST", body: JSON.stringify({ bdName: "刘英安" }), headers: { "content-type": "application/json" },
    }), { db: db as never, sessionSecret: "test-secret" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ bdName: "刘英安" });
    expect(response.headers.get("set-cookie")).toContain("bd_session=");
  });

  it("lists merchants using the signed BD identity rather than a client supplied BD name", async () => {
    const db = database({ merchants: [{ merchantId: "merchant:玉林市:10009595", merchantCode: "10009595", merchantName: "华莱士", cityName: "玉林市" }] });
    const session = await createBdSessionValue({ userId: "bd:刘英安", displayName: "刘英安" }, "test-secret");
    const response = await handleBdMerchantsGet(new Request("http://localhost/api/bd/merchants?bdName=其他人", { headers: { cookie: `bd_session=${session}` } }), { db: db as never, sessionSecret: "test-secret" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ bdName: "刘英安", items: [{ merchantCode: "10009595" }] });
    expect(db.calls.some((call) => call.values.includes("bd:刘英安"))).toBe(true);
    expect(db.calls.some((call) => call.values.includes("其他人"))).toBe(false);
  });

  it("stores a complete dual-platform collection and returns its task identifier", async () => {
    const db = database();
    const bucket = { put: async () => undefined, get: async () => null, delete: async () => undefined };
    const form = new FormData();
    form.set("merchantId", "merchant:玉林市:10009595");
    form.set("originalDeliveryFee", "5");
    form.set("meituanFile", new File([new Uint8Array([1])], "meituan.png", { type: "image/png" }));
    form.set("bJiaFile", new File([new Uint8Array([2])], "bjia.jpg", { type: "image/jpeg" }));
    const response = await handleCollectionPost(new Request("http://localhost/api/uploads", { method: "POST", body: form }), {
      db: db as never,
      bucket: bucket as never,
      bd: { userId: "bd:刘英安", displayName: "刘英安" },
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ status: "UPLOADED", imageCount: 2 });
  });
});
