import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("BD collection page", () => {
  it("guides a BD through identity, owned merchant, and dual-platform uploads", () => {
    const page = readFileSync(join(process.cwd(), "src/app/collect/page.tsx"), "utf8");

    expect(page).toContain("选择我的身份");
    expect(page).toContain("我负责的商家");
    expect(page).toContain("美团订单长图");
    expect(page).toContain("B 家订单长图");
    expect(page).toContain("原价配送费");
    expect(page).toContain("/api/uploads");
  });

  it("does not ask a BD to review an order number", () => {
    const page = readFileSync(join(process.cwd(), "src/app/collect/[id]/page.tsx"), "utf8");

    expect(page).not.toContain('"orderNumber", "goodsTotal"');
    expect(page).not.toContain('orderNumber: "订单号"');
  });
});
