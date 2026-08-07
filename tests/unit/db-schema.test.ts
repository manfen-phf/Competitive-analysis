import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("database schema", () => {
  it("uses PostgreSQL and stores structured recognition data without screenshots", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toMatch(/recognitionJson\s+Json\?/);
    expect(schema).not.toMatch(/image(FileId|Data|AccessToken|MimeType)/);
  });
  it("includes a PostgreSQL migration for a new CloudBase database", () => {
    expect(existsSync(join(process.cwd(), "prisma/migrations"))).toBe(true);
  });
});