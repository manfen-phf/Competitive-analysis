import { afterEach, describe, expect, it, vi } from "vitest";
import { createQwenRecognitionProvider } from "@/lib/recognition-provider";

const completeRecognition = {
  platform: "MEITUAN",
  orderNumber: "MT-20260814-001",
  dishPrice: 32.5,
  packagingFee: 2,
  platformRedPacket: 3,
  originalDeliveryFee: 5,
  deliveryFeeReduction: 2,
  paidDeliveryFee: 3,
  merchantSettlementAmount: 24.5,
  userPaidAmount: 34.5,
  otherPromotion: 1,
  technicalServiceFee: 2.4,
  deliveryServiceFee: 3.2,
  merchantRate: 0.12,
  confidence: 0.96,
};

afterEach(() => vi.unstubAllGlobals());

describe("Qwen recognition provider", () => {
  it("sends the original image and returns a complete structured result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: `\`\`\`json\n${JSON.stringify(completeRecognition)}\n\`\`\`` } }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createQwenRecognitionProvider({ apiKey: "qwen-test-key", model: "qwen-vl-plus" })
      .recognize({ imageDataUrl: "data:image/png;base64,AA==", expectedPlatform: "MEITUAN" });

    expect(result).toEqual(completeRecognition);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer qwen-test-key" }) }),
    );
  });

  it("rejects a model answer that omits a required order field", async () => {
    const incomplete = { ...completeRecognition } as Record<string, unknown>;
    delete incomplete.merchantRate;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(incomplete) } }],
    }), { status: 200 })));

    await expect(createQwenRecognitionProvider({ apiKey: "qwen-test-key", model: "qwen-vl-plus" })
      .recognize({ imageDataUrl: "data:image/png;base64,AA==", expectedPlatform: "MEITUAN" }))
      .rejects.toThrow("字段缺失或金额格式错误");
  });
});
