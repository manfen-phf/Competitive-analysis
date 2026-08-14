import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pagePath = new URL("../../src/app/admin/import/page.tsx", import.meta.url);

describe("管理员主数据导入页", () => {
  it("提供导入结果摘要和按城市、BD筛选的商家列表入口", () => {
    const page = readFileSync(pagePath, "utf8");

    expect(page).toContain("本次导入");
    expect(page).toContain("负责BD");
    expect(page).toContain("商家主数据");
    expect(page).toContain("void loadMerchants({ city, bd, query })");
  });
});
