import { describe, expect, it } from "vitest";
import { toRecordListItem } from "../../src/lib/record-list";

describe("识别记录列表", () => {
  it("保留识别 JSON，但不返回任何图片地址", () => {
    const item = toRecordListItem({
      id: "upload-1",
      uploadedAt: new Date("2026-08-06T10:00:00+08:00"),
      recognitionJson: { orderNumber: "A1001", userPaidAmount: 32.5, merchantSettlementAmount: 20, platformRedPacket: 3, paidDeliveryFee: 2 },
      order: { orderNumber: "A1001", platform: "MEITUAN", merchantId: "M1", merchantName: "示例商家", city: "玉林市", bdName: "小王", userPaidAmount: 32.5, merchantSettlementAmount: 20, platformRedPacket: 3, paidDeliveryFee: 2 },
      failure: null,
    });

    expect(item).toMatchObject({ status: "SUCCESS", merchantName: "示例商家", platform: "MEITUAN", userPaidAmount: 32.5, recognitionJson: { orderNumber: "A1001" } });
    expect(item).not.toHaveProperty("imageUrl");
  });
});