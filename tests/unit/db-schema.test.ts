import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";

describe("database", () => {
  let getPrisma: typeof import("../../src/lib/db").getPrisma;

  beforeAll(async () => {
    process.env.DATABASE_URL = "file:./dev.db";
    ({ getPrisma } = await import("../../src/lib/db"));
  });

  it("connects to the local SQLite database", async () => {
    const prisma = await getPrisma();
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeTruthy();
  });

  it("stores each upload image as D1 binary data", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).toMatch(/imageData\s+Bytes/);
    expect(schema).toMatch(/imageMimeType\s+String/);
  });
  it("uses local SQLite rather than a D1 adapter during development", () => {
    const db = readFileSync(join(process.cwd(), "src/lib/db.ts"), "utf8");
    expect(db).toContain('process.env.NODE_ENV === "production"');
  });
});
