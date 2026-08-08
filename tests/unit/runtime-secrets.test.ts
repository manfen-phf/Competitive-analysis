import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Cloudflare runtime secrets", () => {
  it("does not activate administrator or Qwen secrets before their P0 stages", () => {
    const adminRoute = readFileSync(join(process.cwd(), "src/app/api/admin/master-data/route.ts"), "utf8");
    const ocr = readFileSync(join(process.cwd(), "src/lib/ocr.ts"), "utf8");

    expect(adminRoute).toContain("p0Unavailable");
    expect(ocr).not.toContain('getRuntimeSecret("QWEN_API_KEY")');
    expect(ocr).toContain('qwen-vl-plus');
  });
});
