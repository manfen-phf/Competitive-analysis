import { describe, expect, it } from "vitest";
import { handleManagementAnalyticsGet, handleManagementFilterOptionsGet, handleManagementMerchantsGet } from "../../src/lib/management-api";

describe("management analytics API", () => {
  it("returns overview data filtered by the requested city", async () => {
    const db = {
      prepare(sql: string) {
        return {
          bind() { return this; },
          async all() {
            if (sql.includes('FROM "ConfirmedOrderV1"')) return { results: [] };
            return { results: [{ collectionSessionId: "session:1", uploadImageId: "image:1", platform: "MEITUAN", recognitionStatus: "SUCCESS", confirmedOrderId: null }] };
          },
        };
      },
    };

    const response = await handleManagementAnalyticsGet(new Request("https://example.com/api/analytics?city=%E7%8E%89%E6%9E%97%E5%B8%82"), db as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ filters: { city: "玉林市" }, collection: { uploadImageCount: 1 } });
  });

  it("returns city, BD and merchant filter options from D1", async () => {
    const db = {
      prepare(sql: string) {
        return {
          bind() { return this; },
          async all() {
            if (sql.includes('FROM "City"')) return { results: [{ name: "玉林市" }] };
            if (sql.includes('FROM "UserAccount"')) return { results: [{ displayName: "张三" }] };
            return { results: [{ merchantId: "merchant:1", merchantName: "甲店", cityName: "玉林市", bdName: "张三" }] };
          },
        };
      },
    };

    const response = await handleManagementFilterOptionsGet(new Request("https://example.com/api/filter-options"), db as never);

    await expect(response.json()).resolves.toEqual({ cities: ["玉林市"], bds: ["张三"], merchants: [{ merchantId: "merchant:1", merchantName: "甲店", cityName: "玉林市", bdName: "张三" }] });
  });

  it("returns a city-scoped merchant search result without exposing orders", async () => {
    const db = {
      prepare() {
        return { bind() { return this; }, async all() { return { results: [{ merchantId: "merchant:1", merchantName: "甲店", cityName: "玉林市", bdName: "张三" }] }; } };
      },
    };
    const response = await handleManagementMerchantsGet(new Request("https://example.com/api/merchants?city=%E7%8E%89%E6%9E%97%E5%B8%82&query=%E7%94%B2"), db as never);
    await expect(response.json()).resolves.toEqual({ merchants: [{ merchantId: "merchant:1", merchantName: "甲店", cityName: "玉林市", bdName: "张三" }] });
  });
});
