import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { handleMasterDataGet, handleMasterDataPost } from "@/lib/master-data-api";

const headers = ["\u5916\u5356\u7ec4\u7ec7\u7ed3\u6784", "\u5546\u5bb6ID", "\u5546\u5bb6\u540d\u79f0", "\u5408\u4f5cBD"];

function workbookFile(rows: unknown[][], headings = headers): File {
  const worksheet = XLSX.utils.aoa_to_sheet([headings, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "0");
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([bytes], "merchants.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function fakeDb() {
  const sql: string[] = [];
  let batchCalls = 0;
  return {
    sql,
    get batchCalls() { return batchCalls; },
    prepare(query: string) {
      sql.push(query);
      const statement = {
        bind: () => statement,
        all: async <T>() => ({ results: [] as T[] }),
      };
      return statement;
    },
    async batch() { batchCalls += 1; return []; },
  };
}

function importRequest(form: FormData) {
  return new Request("http://localhost/api/admin/master-data", { method: "POST", body: form });
}

describe("master data admin API", () => {
  it("accepts a correct administrator passcode in verification mode", async () => {
    const form = new FormData();
    form.set("passcode", "secret");
    form.set("verifyOnly", "true");

    const response = await handleMasterDataPost(importRequest(form), { db: fakeDb() as never, adminPasscode: "secret" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ valid: true });
  });

  it("rejects an incorrect administrator passcode", async () => {
    const form = new FormData();
    form.set("passcode", "incorrect");

    const response = await handleMasterDataPost(importRequest(form), { db: fakeDb() as never, adminPasscode: "secret" });

    expect(response.status).toBe(401);
  });

  it("imports a valid workbook after passcode verification", async () => {
    const db = fakeDb();
    const form = new FormData();
    form.set("passcode", "secret");
    form.set("effectiveFrom", "2026-08-14");
    form.set("file", workbookFile([["\u7389\u6797\u5e02", "M-1", "\u5546\u5bb6 A", "\u5f20\u4e09"]]));

    const response = await handleMasterDataPost(importRequest(form), { db: db as never, adminPasscode: "secret" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ imported: 1, insertedMerchants: 1 });
    expect(db.batchCalls).toBeGreaterThan(0);
  });

  it("rejects an invalid workbook without writing D1 data", async () => {
    const db = fakeDb();
    const form = new FormData();
    form.set("passcode", "secret");
    form.set("file", workbookFile([["\u7389\u6797\u5e02", "M-1", "\u5546\u5bb6 A"]], headers.slice(0, 3)));

    const response = await handleMasterDataPost(importRequest(form), { db: db as never, adminPasscode: "secret" });

    expect(response.status).toBe(422);
    expect(db.batchCalls).toBe(0);
  });

  it("rejects requests that omit an Excel file", async () => {
    const form = new FormData();
    form.set("passcode", "secret");

    const response = await handleMasterDataPost(importRequest(form), { db: fakeDb() as never, adminPasscode: "secret" });

    expect(response.status).toBe(400);
  });

  it("returns the approved merchant list query shape", async () => {
    const response = await handleMasterDataGet(new Request("http://localhost/api/admin/master-data?city=%E7%8E%89%E6%9E%97%E5%B8%82&query=M-1&bd=%E5%BC%A0%E4%B8%89"), fakeDb() as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ items: [], filters: { cities: [], bds: [] } });
  });
});
