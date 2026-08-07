import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("识别结果导出", () => {
  it("以管理员口令保护 Excel 导出，并包含原始识别 JSON", () => {
    const source = readFileSync(join(process.cwd(), "src/app/api/admin/records-export/route.ts"), "utf8");
    expect(source).toContain('getRuntimeSecret("ADMIN_IMPORT_PASSCODE")');
    expect(source).toContain("XLSX.write");
    expect(source).toContain("原始识别JSON");
  });
});