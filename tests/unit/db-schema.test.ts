import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("database", () => {
  it("keeps the generated client aligned with the D1 order data-center migration", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).toContain('provider = "sqlite"');
    expect(schema).not.toContain('provider = "postgresql"');
    expect(schema).toMatch(/merchantActivity\s+Float\s+@default\(0\)/);
    expect(schema).toMatch(/updatedAt\s+DateTime\s+@updatedAt/);
    expect(schema).toMatch(/audits\s+OrderAuditLog\[\]/);
    expect(schema).toContain("model OrderAuditLog {");
    expect(schema).toContain('@relation(fields: [orderId], references: [id], onDelete: Cascade)');
  });

  it("keeps the runtime client on the Cloudflare D1 adapter", () => {
    const db = readFileSync(join(process.cwd(), "src/lib/db.ts"), "utf8");
    expect(db).toContain('import { PrismaD1 } from "@prisma/adapter-d1"');
    expect(db).toContain("new PrismaClient({ adapter: new PrismaD1(env.DB) })");
    expect(db).not.toContain('provider = "postgresql"');
  });
});
