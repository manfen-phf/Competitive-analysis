import { describe, expect, it } from "vitest";
import { findBdForMerchant, parseMasterDataRows, searchMerchants } from "../../src/lib/master-data";

describe("master data", () => {
  it("rejects a row missing city", () => {
    expect(parseMasterDataRows([{ "商家ID": "M-1", "商家名称": "店铺", "BD姓名": "小王", "生效开始日": "2026-01-01" }]).valid).toBe(false);
  });

  it("matches BD by upload date", () => {
    expect(findBdForMerchant([
      { merchantId: "M-1", merchantName: "店铺", city: "玉林市", bdName: "小王", effectiveFrom: new Date("2026-01-01"), effectiveTo: new Date("2026-06-30") },
      { merchantId: "M-1", merchantName: "店铺", city: "玉林市", bdName: "小李", effectiveFrom: new Date("2026-07-01"), effectiveTo: null },
    ], "M-1", new Date("2026-07-30")).bdName).toBe("小李");
  });

  it("rejects an end date earlier than the effective start", () => {
    const result = parseMasterDataRows([{ "商家ID": "M-1", "商家名称": "店铺", "城市": "玉林市", "BD姓名": "小王", "生效开始日": "2026-08-01", "生效结束日": "2026-07-31" }]);
    expect(result.valid).toBe(false);
  });

  it("accepts the supplied daily source columns with an import date", () => {
    const result = parseMasterDataRows([{ "外卖组织结构": "博白县", "商家ID": 33777776, "商家名称": "蚝爽", "合作BD": "甘宇" }], new Date("2026-07-01"));
    expect(result).toMatchObject({ valid: true, rows: [{ merchantId: "33777776", city: "博白县", bdName: "甘宇" }] });
  });

  it("only returns merchants in the selected city", () => {
    const records = [
      { merchantId: "M-1", merchantName: "玉林店", city: "玉林市", bdName: "小王", effectiveFrom: new Date(), effectiveTo: null },
      { merchantId: "M-2", merchantName: "南宁店", city: "南宁市", bdName: "小李", effectiveFrom: new Date(), effectiveTo: null },
    ];
    expect(searchMerchants(records, "玉林市", "店").map((item) => item.merchantId)).toEqual(["M-1"]);
  });
});
