import { describe, expect, it } from "vitest";
import { createCollection, validateCollectionUpload } from "@/lib/bd-collection";

describe("BD dual-platform collection", () => {
  it("requires exactly one Meituan image and one B家 image", async () => {
    await expect(validateCollectionUpload([
      { platform: "MEITUAN", imageHash: "a".repeat(64), imageMimeType: "image/png", bytes: new Uint8Array([1]) },
    ])).rejects.toThrow("美团和 B 家截图必须同时上传");
  });

  it("rejects duplicate image bytes before creating a collection task", async () => {
    await expect(validateCollectionUpload([
      { platform: "MEITUAN", imageHash: "a".repeat(64), imageMimeType: "image/png", bytes: new Uint8Array([1]) },
      { platform: "B_JIA", imageHash: "a".repeat(64), imageMimeType: "image/png", bytes: new Uint8Array([1]) },
    ])).rejects.toThrow("两张截图不能是同一张图片");
  });

  it("writes one collection and its two platform images only for the responsible BD", async () => {
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    const db = {
      prepare(sql: string) {
        const statement = {
          bind(...values: unknown[]) { statements.push({ sql, values }); return statement; },
          all: async <T>() => ({ results: (sql.includes("MerchantBdAssignment") ? [{ assigned: 1 }] : []) as T[] }),
        };
        return statement;
      },
      batch: async () => [],
    };
    const saved: string[] = [];
    const bucket = {
      put: async (key: string) => { saved.push(key); },
      get: async () => null,
      delete: async () => undefined,
    };

    const result = await createCollection({
      db: db as never,
      bucket: bucket as never,
      bdUserId: "bd:刘英安",
      merchantId: "merchant:玉林市:10009595",
      originalDeliveryFee: 5,
      images: [
        { platform: "MEITUAN", imageHash: "a".repeat(64), imageMimeType: "image/png", bytes: new Uint8Array([1]) },
        { platform: "B_JIA", imageHash: "b".repeat(64), imageMimeType: "image/jpeg", bytes: new Uint8Array([2]) },
      ],
    });

    expect(result.imageCount).toBe(2);
    expect(saved).toEqual([`screenshots/aa/${"a".repeat(64)}.png`, `screenshots/bb/${"b".repeat(64)}.jpg`]);
    expect(statements.some((item) => item.sql.includes('INSERT INTO "CollectionSession"'))).toBe(true);
    expect(statements.filter((item) => item.sql.includes('INSERT INTO "UploadImage"'))).toHaveLength(2);
  });

  it("refuses uploads for a merchant not assigned to the selected BD", async () => {
    const db = {
      prepare() {
        const statement = { bind: () => statement, all: async () => ({ results: [] }) };
        return statement;
      },
      batch: async () => [],
    };
    const bucket = { put: async () => { throw new Error("must not store"); }, get: async () => null, delete: async () => undefined };

    await expect(createCollection({
      db: db as never,
      bucket: bucket as never,
      bdUserId: "bd:刘英安",
      merchantId: "merchant:玉林市:other",
      originalDeliveryFee: 5,
      images: [
        { platform: "MEITUAN", imageHash: "a".repeat(64), imageMimeType: "image/png", bytes: new Uint8Array([1]) },
        { platform: "B_JIA", imageHash: "b".repeat(64), imageMimeType: "image/png", bytes: new Uint8Array([2]) },
      ],
    })).rejects.toThrow("只能为自己负责的商家采集");
  });
});
