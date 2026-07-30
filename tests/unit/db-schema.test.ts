import { describe, expect, it } from "vitest";
import { getPrisma } from "../../src/lib/db";

describe("database", () => {
  it("connects to the local SQLite database", async () => {
    const prisma = await getPrisma();
    await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeTruthy();
  });
});
