import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Cloudflare Prisma configuration", () => {
  it("uses the OpenNext Worker with explicit D1 and R2 bindings", () => {
    const config = readFileSync(join(process.cwd(), "wrangler.jsonc"), "utf8");

    expect(config).toContain('"main": ".open-next/worker.js"');
    expect(config).toContain('"binding": "DB"');
    expect(config).toContain('"binding": "SCREENSHOT_BUCKET"');
    expect(config).toContain('"r2_buckets"');
  });

  it("keeps Prisma packages external so workerd uses their Cloudflare runtime", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

    expect(config).toContain("serverExternalPackages");
    expect(config).toContain('"@prisma/client"');
    expect(config).toContain('".prisma/client"');
  });

  it("generates Prisma Client before the Cloudflare build runs", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

    expect(packageJson.scripts.prebuild).toBe("prisma generate");
  });
});
