import { describe, expect, it } from "vitest";
import { toRecordListItem } from "../../src/lib/record-list";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("upload record list", () => {
  it("keeps the merchant, platform, image link and recognized amounts for a successful upload", () => {
    const item = toRecordListItem({
      id: "upload-1", uploadedAt: new Date("2026-08-06T10:00:00+08:00"), imageAccessToken: "token-1",
      order: { orderNumber: "order-1", platform: "MEITUAN", merchantId: "m-1", merchantName: "示例商家", city: "玉林市", bdName: "小李", userPaidAmount: 32.5, merchantSettlementAmount: 25, platformRedPacket: 4, paidDeliveryFee: 3 },
      failure: null,
    });
    expect(item).toMatchObject({ status: "SUCCESS", merchantName: "示例商家", platform: "MEITUAN", userPaidAmount: 32.5, imageUrl: "/api/uploads/upload-1/image?token=token-1" });
  });

  it("names the administrator screen as recognition data management", () => {
    const page = readFileSync(join(process.cwd(), "src/app/records/page.tsx"), "utf8");
    expect(page).toContain("\\u8bc6\\u522b\\u6570\\u636e\\u7ba1\\u7406");
  });

  it("lets an administrator inspect the source image and export the filtered records", () => {
    const page = readFileSync(join(process.cwd(), "src/app/records/page.tsx"), "utf8");
    expect(page).toContain("\\u5bfc\\u51fa\\u5f53\\u524d\\u7b5b\\u9009");
    expect(page).toContain("/api/records/${item.uploadImageId}/image");
  });
});
