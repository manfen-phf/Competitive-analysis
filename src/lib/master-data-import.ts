import * as XLSX from "xlsx";

const REQUIRED_COLUMNS = ["外卖组织结构", "商家ID", "商家名称", "合作BD"] as const;

export type NormalizedMerchantRow = {
  rowNumber: number;
  cityName: string;
  merchantCode: string;
  merchantName: string;
  bdName: string;
  effectiveFrom: string;
};

export type ImportPreview = {
  rows: NormalizedMerchantRow[];
  summary: {
    totalRows: number;
    cityCount: number;
    bdCount: number;
  };
};

function textValue(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("Merchant ID must be a safe integer or text");
    return String(value);
  }
  return String(value ?? "").trim();
}

function requireEffectiveDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Effective date must use YYYY-MM-DD");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Effective date is invalid");
  }
  return value;
}

function headerIndex(headers: unknown[], required: string): number {
  return headers.findIndex((value) => textValue(value) === required);
}

export function parseMasterDataWorkbook(buffer: ArrayBuffer, effectiveFrom: string): ImportPreview {
  const normalizedEffectiveFrom = requireEffectiveDate(effectiveFrom);
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Workbook does not contain a worksheet");

  const worksheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "", blankrows: false });
  const headers = matrix[0] ?? [];
  const columnIndexes = REQUIRED_COLUMNS.map((column) => ({ column, index: headerIndex(headers, column) }));
  const missing = columnIndexes.filter(({ index }) => index < 0).map(({ column }) => column);
  if (missing.length > 0) throw new Error(`Missing required column: ${missing.join(", ")}`);

  const rows: NormalizedMerchantRow[] = [];
  const firstRowsByKey = new Map<string, number>();

  for (let matrixIndex = 1; matrixIndex < matrix.length; matrixIndex += 1) {
    const sourceRow = matrix[matrixIndex] ?? [];
    const rowNumber = matrixIndex + 1;
    const cityName = textValue(sourceRow[columnIndexes[0]!.index]);
    const merchantCode = textValue(sourceRow[columnIndexes[1]!.index]);
    const merchantName = textValue(sourceRow[columnIndexes[2]!.index]);
    const bdName = textValue(sourceRow[columnIndexes[3]!.index]);

    if (!cityName || !merchantCode || !merchantName || !bdName) {
      throw new Error(`Row ${rowNumber} must include city, merchant ID, merchant name, and BD`);
    }
    if (/e[+-]?\d+$/i.test(merchantCode)) {
      throw new Error(`Row ${rowNumber} merchant ID must not use scientific notation`);
    }

    const key = `${cityName}\u0000${merchantCode}`;
    const firstRow = firstRowsByKey.get(key);
    if (firstRow) throw new Error(`Row ${rowNumber} duplicates Row ${firstRow} for city and merchant ID`);
    firstRowsByKey.set(key, rowNumber);

    rows.push({ rowNumber, cityName, merchantCode, merchantName, bdName, effectiveFrom: normalizedEffectiveFrom });
  }

  if (rows.length === 0) throw new Error("Workbook does not contain merchant data rows");

  return {
    rows,
    summary: {
      totalRows: rows.length,
      cityCount: new Set(rows.map((row) => row.cityName)).size,
      bdCount: new Set(rows.map((row) => row.bdName)).size,
    },
  };
}
