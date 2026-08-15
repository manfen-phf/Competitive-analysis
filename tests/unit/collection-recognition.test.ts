import { describe, expect, it } from "vitest";
import { confirmCollection, recognizeCollection } from "@/lib/collection-recognition";

const recognized = (platform: "MEITUAN" | "B_JIA") => ({ platform, goodsTotal: 32, orderNumber: null, packagingFee: null, merchantActivityAmount: null, deliveryFeeReduction: null, platformRedPacketAmount: null, platformRedPacketMerchantShare: null, merchantSettlementAmount: null, technicalServiceFee: null, deliveryServiceFee: null, confidence: 0.95 });

function recognitionDb() {
  const batches: Array<Array<{ sql: string; values: unknown[] }>> = [];
  const db = { prepare(sql: string) { const statement = { sql, values: [] as unknown[], bind(...values: unknown[]) { statement.values = values; return statement; }, all: async <T>() => ({ results: (sql.includes('FROM "CollectionSession"') ? [
    { imageId: "image:mt", platform: "MEITUAN", r2Key: "screenshots/a.png", imageMimeType: "image/png", originalDeliveryFee: 5 },
    { imageId: "image:bj", platform: "B_JIA", r2Key: "screenshots/b.png", imageMimeType: "image/jpeg", originalDeliveryFee: 5 },
  ] : []) as T[] }) }; return statement; }, batch: async (statements: Array<{ sql: string; values: unknown[] }>) => { batches.push(statements); return []; } };
  return { db, batches };
}

describe("collection recognition", () => {
  it("recognizes both platform images despite missing optional screenshot fields", async () => {
    const { db, batches } = recognitionDb();
    const result = await recognizeCollection({ db: db as never, bucket: { get: async () => ({ arrayBuffer: async () => new Uint8Array([1]).buffer }) } as never, collectionSessionId: "collection:1", bdUserId: "bd:1", provider: { name: "QWEN", recognize: async ({ expectedPlatform }) => recognized(expectedPlatform) } });
    expect(result.status).toBe("RECOGNIZED");
    expect(result.results[0].result?.dishPrice).toBe(32);
    expect(batches[0].filter((statement) => statement.sql.includes('INSERT INTO "RecognitionResult"'))).toHaveLength(2);
  });

  it("persists a recognition failure only when the model cannot provide goods total", async () => {
    const { db, batches } = recognitionDb();
    const result = await recognizeCollection({ db: db as never, bucket: { get: async () => ({ arrayBuffer: async () => new Uint8Array([1]).buffer }) } as never, collectionSessionId: "collection:1", bdUserId: "bd:1", provider: { name: "QWEN", recognize: async () => { throw new Error("未识别到商品总价"); } } });
    expect(result.status).toBe("RECOGNITION_FAILED");
    expect(batches[0].some((statement) => statement.sql.includes("RecognitionFailureV1"))).toBe(true);
  });

  it("writes nullable screenshot values to the flexible confirmed order table", async () => {
    const { db, batches } = recognitionDb();
    await confirmCollection({ db: db as never, collectionSessionId: "collection:1", bdUserId: "bd:1", results: [recognized("MEITUAN"), recognized("B_JIA")] });
    const writes = batches[0].filter((statement) => statement.sql.includes('INSERT INTO "ConfirmedOrderV1"'));
    expect(writes).toHaveLength(2);
    expect(writes[0].values).toContain(null);
    expect(writes[0].values).toContain(5);
  });
});
