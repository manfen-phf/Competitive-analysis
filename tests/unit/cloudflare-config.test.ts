import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("database runtime configuration", () => {
  it("does not depend on Cloudflare D1 at runtime", () => {
    const databaseCode = readFileSync(join(process.cwd(), "src/lib/db.ts"), "utf8");

    expect(databaseCode).not.toContain("@prisma/adapter-d1");
    expect(databaseCode).not.toContain("@opennextjs/cloudflare");
    expect(databaseCode).not.toContain("D1Database");
  });

  it("generates Prisma Client before the production build runs", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

    expect(packageJson.scripts.prebuild).toBe("prisma generate");
  });
});