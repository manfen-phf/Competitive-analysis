import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Cloudflare Prisma configuration", () => {
  it("keeps Prisma packages external so workerd uses their Cloudflare runtime", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

    expect(config).toContain("serverExternalPackages");
    expect(config).toContain('"@prisma/client"');
    expect(config).toContain('".prisma/client"');
  });
});
