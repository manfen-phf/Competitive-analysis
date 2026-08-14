import { describe, expect, it } from "vitest";
import { syncMasterData } from "@/lib/d1-master-data";
import type { NormalizedMerchantRow } from "@/lib/master-data-import";

type FakeStatement = { sql: string; bind: (...values: unknown[]) => FakeStatement; all: <T>() => Promise<{ results: T[] }> };

function fakeD1() {
  const sql: string[] = [];
  let batchCalls = 0;
  const statement: FakeStatement = {
    sql: "",
    bind: () => statement,
    all: async <T>() => ({ results: [] as T[] }),
  };

  return {
    sql,
    get batchCalls() {
      return batchCalls;
    },
    prepare(query: string) {
      sql.push(query);
      return { ...statement, sql: query };
    },
    async batch(statements: FakeStatement[]) {
      batchCalls += 1;
      statements.forEach((item) => sql.push(item.sql));
      return [];
    },
  };
}

const rows: NormalizedMerchantRow[] = [
  { rowNumber: 2, cityName: "\u7389\u6797\u5e02", merchantCode: "M-1", merchantName: "\u5546\u5bb6 A", bdName: "\u5f20\u4e09", effectiveFrom: "2026-08-14" },
  { rowNumber: 3, cityName: "\u7389\u6797\u5e02", merchantCode: "M-2", merchantName: "\u5546\u5bb6 B", bdName: "\u674e\u56db", effectiveFrom: "2026-08-14" },
];

describe("D1 master data sync", () => {
  it("creates cities, BD users, merchants, and active assignments", async () => {
    const db = fakeD1();

    const result = await syncMasterData(db as never, rows);

    expect(result).toMatchObject({ totalRows: 2, insertedMerchants: 2, insertedBds: 2, cityCount: 1, bdCount: 2, updatedAssignments: 2 });
    expect(db.sql.join("\n")).toContain('INSERT INTO "MerchantBdAssignment"');
  });

  it("does not count existing merchants, BDs, or active assignments as new", async () => {
    const existing = fakeD1();
    const originalPrepare = existing.prepare.bind(existing);
    existing.prepare = (query: string) => {
      const statement = originalPrepare(query);
      if (query.includes('FROM "Merchant"')) statement.all = async () => ({ results: rows.map((row) => ({ cityName: row.cityName, merchantCode: row.merchantCode, merchantName: row.merchantName })) });
      if (query.includes('FROM "UserAccount"')) statement.all = async () => ({ results: rows.map((row) => ({ externalSubject: `bd:${row.bdName}` })) });
      if (query.includes('FROM "MerchantBdAssignment"')) statement.all = async () => ({ results: rows.map((row) => ({ merchantId: `merchant:${row.cityName}:${row.merchantCode}`, bdUserId: `bd:${row.bdName}` })) });
      return statement;
    };

    const result = await syncMasterData(existing as never, rows);

    expect(result).toMatchObject({ insertedMerchants: 0, updatedMerchants: 0, insertedBds: 0, updatedAssignments: 0 });
  });

  it("batches a large first import instead of issuing one D1 batch per row", async () => {
    const db = fakeD1();
    const largeRows = Array.from({ length: 1000 }, (_, index): NormalizedMerchantRow => ({
      rowNumber: index + 2,
      cityName: "玉林市",
      merchantCode: `M-${index + 1}`,
      merchantName: `商家 ${index + 1}`,
      bdName: index % 2 === 0 ? "张三" : "李四",
      effectiveFrom: "2026-08-14",
    }));

    await syncMasterData(db as never, largeRows);

    expect(db.batchCalls).toBeLessThanOrEqual(2);
  });
});
