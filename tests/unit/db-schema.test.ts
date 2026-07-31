import { describe, expect, it } from "vitest";
import { getPrisma } from "../../src/lib/db";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("database", () => {
  it("connects to the local SQLite database", async () => {
    const prisma = await getPrisma();
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeTruthy();
  });

  it("stores each upload image as D1 binary data", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).toMatch(/imageData\s+Bytes/);
    expect(schema).toMatch(/imageMimeType\s+String/);
  });
});
