import { afterEach, describe, expect, it, vi } from "vitest";
import { createQwenRecognitionProvider } from "@/lib/recognition-provider";

const flexibleRecognition = {
  platform: "MEITUAN",
  goodsTotal: 25.5,
  orderNumber: null,
  packagingFee: 2,
  merchantActivityAmount: 5.5,
  otherActivityAmount: null,
  deliveryFeeReduction: 5.5,
  platformRedPacketAmount: null,
  platformRedPacketMerchantShare: null,
  merchantSettlementAmount: 13.62,
  technicalServiceFee: 3.06,
  deliveryServiceFee: null,
  confidence: 0.96,
};

afterEach(() => vi.unstubAllGlobals());

describe("Qwen recognition provider", () => {
  it("sends the original image and accepts unknown optional values as null", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: `\`\`\`json\n${JSON.stringify(flexibleRecognition)}\n\`\`\`` } }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createQwenRecognitionProvider({ apiKey: "qwen-test-key", model: "qwen-vl-plus" })
      .recognize({ imageDataUrl: "data:image/png;base64,AA==", expectedPlatform: "MEITUAN" });

    expect(result).toEqual(flexibleRecognition);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer qwen-test-key" }) }),
    );
  });

  it("rejects a model answer without the mandatory goods total", async () => {
    const incomplete = { ...flexibleRecognition } as Record<string, unknown>;
    delete incomplete.goodsTotal;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(incomplete) } }],
    }), { status: 200 })));

    await expect(createQwenRecognitionProvider({ apiKey: "qwen-test-key", model: "qwen-vl-plus" })
      .recognize({ imageDataUrl: "data:image/png;base64,AA==", expectedPlatform: "MEITUAN" }))
      .rejects.toThrow("未识别到商品总价");
  });
});
