import { describe, expect, it } from "vitest";
import { getManagementOverview, parseManagementFilters, summarizeCollectionStates, summarizeConfirmedOrders } from "../../src/lib/management-analytics";

describe("management analytics", () => {
  it("counts a collection as paired only after both platform results are confirmed", () => {
    const summary = summarizeCollectionStates([
      { collectionSessionId: "session:1", uploadImageId: "image:m1", platform: "MEITUAN", recognitionStatus: "SUCCESS", confirmedOrderId: "order:m1" },
      { collectionSessionId: "session:1", uploadImageId: "image:b1", platform: "B_JIA", recognitionStatus: "SUCCESS", confirmedOrderId: "order:b1" },
      { collectionSessionId: "session:2", uploadImageId: "image:m2", platform: "MEITUAN", recognitionStatus: "SUCCESS", confirmedOrderId: "order:m2" },
      { collectionSessionId: "session:3", uploadImageId: "image:b3", platform: "B_JIA", recognitionStatus: "FAILED", confirmedOrderId: null },
    ]);

    expect(summary).toMatchObject({
      uploadImageCount: 4,
      recognizedImageCount: 3,
      failedImageCount: 1,
      confirmedImageCount: 3,
      collectionCount: 3,
      pairedCollectionCount: 1,
      incompleteCollectionCount: 2,
    });
  });

  it("keeps other activity separate while retaining platform financial averages", () => {
    const summary = summarizeConfirmedOrders([
      {
        collectionSessionId: "session:1", platform: "MEITUAN", merchantId: "merchant:1", merchantName: "甲店", cityName: "玉林市", bdName: "张三", uploadedAt: "2026-08-15T08:00:00.000Z",
        goodsTotal: 25.5, dishPrice: 23.5, packagingFee: 2, merchantActivityAmount: 5.5, otherActivityAmount: null, originalDeliveryFee: 5.5, deliveryFeeReduction: 6, paidDeliveryFee: 0, platformRedPacketAmount: null, platformRedPacketMerchantShare: null, merchantSettlementAmount: 13.62, userPaidAmount: 25.5, technicalServiceFee: 3.06, deliveryServiceFee: null, merchantRate: 0.12,
      },
      {
        collectionSessionId: "session:1", platform: "B_JIA", merchantId: "merchant:1", merchantName: "甲店", cityName: "玉林市", bdName: "张三", uploadedAt: "2026-08-15T08:00:00.000Z",
        goodsTotal: 35.8, dishPrice: 35.8, packagingFee: null, merchantActivityAmount: 11.2, otherActivityAmount: 3, originalDeliveryFee: 5.5, deliveryFeeReduction: 4, paidDeliveryFee: 1.5, platformRedPacketAmount: 7, platformRedPacketMerchantShare: 7, merchantSettlementAmount: 14.33, userPaidAmount: 30.1, technicalServiceFee: 2.51, deliveryServiceFee: 7.76, merchantRate: 0.2869,
      },
    ]);

    expect(summary.platforms.MEITUAN.averageGoodsTotal).toBe(25.5);
    expect(summary.platforms.B_JIA.averageOtherActivityAmount).toBe(3);
    expect(summary.merchantRanking).toEqual([expect.objectContaining({ merchantId: "merchant:1", userPaidDifference: -4.6 })]);
  });

  it("reads the live flexible confirmed-order table rather than the legacy Prisma model", async () => {
    const sql: string[] = [];
    const db = {
      prepare(statement: string) {
        sql.push(statement);
        return {
          bind() { return this; },
          async all() {
            return { results: statement.includes('"ConfirmedOrderV1"') ? [] : [] };
          },
        };
      },
    };

    await getManagementOverview(db as never, { city: "玉林市", bd: "张三" });

    expect(sql.join("\n")).toContain('"ConfirmedOrderV1"');
    expect(sql.join("\n")).toContain('"UploadImage"');
    expect(sql.join("\n")).toContain('"City"');
  });

  it("accepts only supported management filters from a URL", () => {
    const filters = parseManagementFilters(new URL("https://example.com/api/analytics?city=%E7%8E%89%E6%9E%97%E5%B8%82&bd=%E5%BC%A0%E4%B8%89&platform=B_JIA&start=2026-08-01&end=2026-09-01&merchantId=merchant%3A1"));
    expect(filters).toEqual({ city: "玉林市", bd: "张三", platform: "B_JIA", start: "2026-08-01", end: "2026-09-01", merchantId: "merchant:1" });
    expect(parseManagementFilters(new URL("https://example.com/api/analytics?platform=unknown"))).toEqual({});
  });
});
