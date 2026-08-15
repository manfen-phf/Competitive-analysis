import { describe, expect, it } from "vitest";
import { confirmCollection, recognizeCollection } from "@/lib/collection-recognition";

const recognized = (platform: "MEITUAN" | "B_JIA") => ({
  platform,
  orderNumber: platform === "MEITUAN" ? "MT-001" : "BJ-001",
  dishPrice: 30,
  packagingFee: 2,
  platformRedPacket: 3,
  originalDeliveryFee: 5,
  deliveryFeeReduction: 2,
  paidDeliveryFee: 3,
  merchantSettlementAmount: 23,
  userPaidAmount: 32,
  otherPromotion: 0,
  technicalServiceFee: 2,
  deliveryServiceFee: 3,
  merchantRate: 0.1,
  confidence: 0.95,
});

function recognitionDb() {
  const batches: Array<Array<{ sql: string; values: unknown[] }>> = [];
  const db = {
    prepare(sql: string) {
      const statement = {
        sql,
        values: [] as unknown[],
        bind(...values: unknown[]) { statement.values = values; return statement; },
        all: async <T>() => ({ results: (sql.includes('FROM "CollectionSession"') ? [
          { imageId: "image:mt", platform: "MEITUAN", r2Key: "screenshots/a.png", imageMimeType: "image/png" },
          { imageId: "image:bj", platform: "B_JIA", r2Key: "screenshots/b.png", imageMimeType: "image/jpeg" },
        ] : []) as T[] }),
      };
      return statement;
    },
    batch: async (statements: Array<{ sql: string; values: unknown[] }>) => { batches.push(statements); return []; },
  };
  return { db, batches };
}

describe("collection recognition", () => {
  it("recognizes both platform images and marks the collection ready for confirmation", async () => {
    const { db, batches } = recognitionDb();
    const seenPlatforms: string[] = [];

    const result = await recognizeCollection({
      db: db as never,
      bucket: { get: async () => ({ arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }) } as never,
      collectionSessionId: "collection:1",
      bdUserId: "bd:1",
      provider: { name: "QWEN", recognize: async ({ expectedPlatform }) => { seenPlatforms.push(expectedPlatform); return recognized(expectedPlatform); } },
    });

    expect(result.status).toBe("RECOGNIZED");
    expect(seenPlatforms).toEqual(["MEITUAN", "B_JIA"]);
    expect(batches[0].filter((statement) => statement.sql.includes('INSERT INTO "RecognitionResult"'))).toHaveLength(2);
    expect(batches[0].some((statement) => statement.values.includes("RECOGNIZED"))).toBe(true);
  });

  it("persists a failed recognition instead of allowing an incomplete result through", async () => {
    const { db, batches } = recognitionDb();

    const result = await recognizeCollection({
      db: db as never,
      bucket: { get: async () => ({ arrayBuffer: async () => new Uint8Array([1]).buffer }) } as never,
      collectionSessionId: "collection:1",
      bdUserId: "bd:1",
      provider: { name: "QWEN", recognize: async () => { throw new Error("字段缺失或金额格式错误"); } },
    });

    expect(result.status).toBe("RECOGNITION_FAILED");
    expect(batches[0].some((statement) => statement.sql.includes('RecognitionFailureV1'))).toBe(true);
    expect(batches[0].some((statement) => statement.values.includes("RECOGNITION_FAILED"))).toBe(true);
  });

  it("confirms only a complete Meituan and B家 pair for the collection owner", async () => {
    const { db, batches } = recognitionDb();

    await confirmCollection({
      db: db as never,
      collectionSessionId: "collection:1",
      bdUserId: "bd:1",
      results: [recognized("MEITUAN"), recognized("B_JIA")],
    });

    expect(batches[0].filter((statement) => statement.sql.includes('INSERT INTO "ConfirmedOrder"'))).toHaveLength(2);
    expect(batches[0].some((statement) => statement.sql.includes("UPDATE \"CollectionSession\" SET \"status\" = 'CONFIRMED'"))).toBe(true);
  });
});
