import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Next.js 路由导出", () => {
  it("将可测试的主数据逻辑保留在路由模块之外", () => {
    const route = readFileSync(join(process.cwd(), "src/app/api/admin/master-data/route.ts"), "utf8");

    expect(route).not.toContain("export async function handleMasterDataPost");
    expect(route).not.toContain("export async function handleMasterDataGet");
    expect(route).not.toContain('runtime = "edge"');
  });
});
