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

  it("states the collection flow in the order a BD actually uses it", () => {
    const page = readFileSync(join(process.cwd(), "src/app/collect/page.tsx"), "utf8");

    expect(page).toContain("\\u9009\\u62e9\\u5546\\u5bb6");
    expect(page).toContain("\\u4e0a\\u4f20\\u53cc\\u5e73\\u53f0\\u622a\\u56fe");
    expect(page).toContain("\\u8bc6\\u522b\\u5e76\\u786e\\u8ba4");
  });
});
