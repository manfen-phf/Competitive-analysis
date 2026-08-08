import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("V1 D1 schema", () => {
  it("uses the D1-compatible SQLite schema for the V1 collection flow", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");

    expect(schema).toContain('provider = "sqlite"');
    expect(schema).toContain("model CollectionSession");
    expect(schema).toContain("model UploadImage");
    expect(schema).toContain("model RecognitionResult");
    expect(schema).toContain("model ConfirmedOrder");
    expect(schema).toMatch(/r2Key\s+String\s+@unique/);
    expect(schema).toMatch(/@@unique\(\[collectionSessionId, platform\]\)/);
  });

  it("requires the Cloudflare D1 binding in production instead of a PostgreSQL fallback", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/db.ts"), "utf8");

    expect(source).toContain("new PrismaD1(env.DB)");
    expect(source).toContain("Cloudflare D1 binding DB is required");
    expect(source).not.toContain("CloudBase and local Node runtimes");
  });
});
