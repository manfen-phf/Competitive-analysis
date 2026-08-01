import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Cloudflare runtime secrets", () => {
  it("reads administrator and Agnes secrets through the runtime binding helper", () => {
    const adminRoute = readFileSync(join(process.cwd(), "src/app/api/admin/master-data/route.ts"), "utf8");
    const ocr = readFileSync(join(process.cwd(), "src/lib/ocr.ts"), "utf8");

    expect(adminRoute).toContain('getRuntimeSecret("ADMIN_IMPORT_PASSCODE")');
    expect(ocr).toContain('getRuntimeSecret("AGNES_API_KEY")');
    expect(ocr).toContain('getRuntimeSecret("AGNES_MODEL")');
  });
});
