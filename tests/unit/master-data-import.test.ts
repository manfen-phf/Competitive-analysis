import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseMasterDataWorkbook } from "@/lib/master-data-import";

const headers = ["\u5916\u5356\u7ec4\u7ec7\u7ed3\u6784", "\u5546\u5bb6ID", "\u5546\u5bb6\u540d\u79f0", "\u5408\u4f5cBD"];

function workbookBuffer(rows: unknown[][], headings = headers): ArrayBuffer {
  const worksheet = XLSX.utils.aoa_to_sheet([headings, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "0");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("master data workbook parser", () => {
  it("normalizes the four approved columns and numeric merchant IDs", () => {
    const result = parseMasterDataWorkbook(workbookBuffer([["\u535a\u767d\u53bf", 33777776, "\u7389\u6797\u5e97", "\u7518\u5b87"]]), "2026-08-14");

    expect(result).toMatchObject({
      rows: [{ rowNumber: 2, cityName: "\u535a\u767d\u53bf", merchantCode: "33777776", merchantName: "\u7389\u6797\u5e97", bdName: "\u7518\u5b87", effectiveFrom: "2026-08-14" }],
      summary: { totalRows: 1, cityCount: 1, bdCount: 1 },
    });
  });

  it("rejects a workbook without every required header", () => {
    expect(() => parseMasterDataWorkbook(workbookBuffer([["\u535a\u767d\u53bf", 1, "\u5546\u5bb6"]], headers.slice(0, 3)), "2026-08-14"))
      .toThrow("Missing required column");
  });

  it("rejects a blank core value with its spreadsheet row number", () => {
    expect(() => parseMasterDataWorkbook(workbookBuffer([["\u535a\u767d\u53bf", 1, "", "\u7518\u5b87"]]), "2026-08-14"))
      .toThrow("Row 2");
  });

  it("rejects duplicated city and merchant ID pairs", () => {
    expect(() => parseMasterDataWorkbook(workbookBuffer([
      ["\u535a\u767d\u53bf", 1, "\u5546\u5bb6 A", "\u7518\u5b87"],
      ["\u535a\u767d\u53bf", 1, "\u5546\u5bb6 A", "\u738b\u535a"],
    ]), "2026-08-14")).toThrow("duplicates Row 2");
  });

  it("rejects a merchant ID written in scientific notation", () => {
    expect(() => parseMasterDataWorkbook(workbookBuffer([["\u535a\u767d\u53bf", "3.3777776E+7", "\u5546\u5bb6 A", "\u7518\u5b87"]]), "2026-08-14"))
      .toThrow("scientific notation");
  });

  it("uses the import day when effective date is omitted by the workbook", () => {
    const result = parseMasterDataWorkbook(workbookBuffer([["\u7389\u6797\u5e02", "M-001", "\u5546\u5bb6 A", "\u7518\u5b87"]]), "2026-08-14");
    expect(result.rows[0]?.effectiveFrom).toBe("2026-08-14");
  });
});
