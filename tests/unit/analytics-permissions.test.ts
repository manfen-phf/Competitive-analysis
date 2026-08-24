import { describe, expect, it } from "vitest";

import { chooseAnalyticsDataset, filterOrdersForUser, naturalWeeksForYear, periodLabel, type ComparableRecord } from "@/lib/analytics";

function record(overrides: Partial<ComparableRecord> = {}): ComparableRecord {
  return {
    merchantId: "M-001",
    merchantName: "示例商家",
    city: "玉林",
    bdName: "张三",
    uploadedAt: "2026-01-04T12:00:00+08:00",
    platform: "MEITUAN",
    dishPrice: 20,
    packagingFee: 2,
    platformRedPacket: 0,
    otherPromotion: 0,
    paidDeliveryFee: 2,
    technicalServiceFee: 1,
    deliveryServiceFee: 1,
    merchantSettlementAmount: 16,
    userPaidAmount: 22,
    merchantRate: 0.1,
    ...overrides,
  };
}

describe("analysis scope", () => {
  it("limits a BD snapshot to its own city and name", () => {
    const rows = [
      record({ city: "玉林", bdName: "张三" }),
      record({ merchantId: "M-002", city: "玉林", bdName: "李四" }),
      record({ merchantId: "M-003", city: "南宁", bdName: "张三" }),
    ];

    expect(filterOrdersForUser({ role: "BD", city: "玉林", bdName: "张三" }, rows)).toEqual([rows[0]]);
  });

  it("allows city and super administrators to read the whole comparison scope", () => {
    const rows = [record(), record({ merchantId: "M-002", city: "南宁", bdName: "李四" })];

    expect(filterOrdersForUser({ role: "CITY_ADMIN", city: "玉林", bdName: null }, rows)).toHaveLength(2);
    expect(filterOrdersForUser({ role: "SUPER_ADMIN", city: null, bdName: null }, rows)).toHaveLength(2);
  });

  it("applies the active merchant assignment scope to BD records", () => {
    const rows = [record({ merchantId: "M-001" }), record({ merchantId: "M-002" })];

    expect(filterOrdersForUser({ role: "BD", city: "玉林", bdName: "张三" }, rows, new Set(["M-001"]))).toEqual([rows[0]]);
  });

  it("uses a real snapshot without mixing demonstration records", () => {
    const real = [record({ merchantId: "REAL-001" })];
    const demo = [record({ merchantId: "DEMO-001" })];

    expect(chooseAnalyticsDataset({
      user: { role: "CITY_ADMIN", city: "玉林", bdName: null },
      realRecords: real,
      demoRecords: demo,
      allowDemo: true,
    })).toEqual({ records: real, source: "REAL" });
  });

  it("never returns demo merchants to a BD without confirmed assigned records", () => {
    const demo = [record({ merchantId: "DEMO-001" })];

    expect(chooseAnalyticsDataset({
      user: { role: "BD", city: "玉林", bdName: "张三" },
      realRecords: [],
      demoRecords: demo,
      allowedMerchantIds: new Set(["M-001"]),
      allowDemo: false,
    })).toEqual({ records: [], source: "EMPTY" });
  });

  it("applies the active merchant assignment scope even when a demo fallback is allowed", () => {
    const demo = [record({ merchantId: "M-001" }), record({ merchantId: "M-002" })];

    expect(chooseAnalyticsDataset({
      user: { role: "BD", city: "玉林", bdName: "张三" },
      realRecords: [],
      demoRecords: demo,
      allowedMerchantIds: new Set(["M-001"]),
      allowDemo: true,
    })).toEqual({ records: [demo[0]], source: "DEMO" });
  });

  it("does not substitute demo data unless the caller explicitly allows it", () => {
    expect(chooseAnalyticsDataset({
      user: { role: "CITY_ADMIN", city: "玉林", bdName: null },
      realRecords: [],
      demoRecords: [record({ merchantId: "DEMO-001" })],
      allowDemo: false,
    })).toEqual({ records: [], source: "EMPTY" });
  });
});

describe("analysis natural weeks", () => {
  it("labels 2026-01-01 through 2026-01-04 as W1", () => {
    expect(periodLabel(new Date("2026-01-04T12:00:00+08:00"), "WEEK")).toBe("2026 W1");
  });

  it("starts W2 on the first Monday of the year", () => {
    expect(periodLabel(new Date("2026-01-05T12:00:00+08:00"), "WEEK")).toBe("2026 W2");
  });

  it("offers the final natural week of the full year", () => {
    const finalWeek = naturalWeeksForYear(2026).at(-1);
    expect(finalWeek).toMatchObject({ label: "2026 W53", start: "2026-12-28", end: "2026-12-31" });
  });
});
