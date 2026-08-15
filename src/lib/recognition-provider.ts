import { recognitionSchema, type RecognitionResult } from "@/lib/validation";

export type RecognitionInput = {
  imageDataUrl: string;
  expectedPlatform: "MEITUAN" | "B_JIA";
};

export type RecognitionProvider = {
  name: "QWEN";
  recognize: (input: RecognitionInput) => Promise<RecognitionResult>;
};

export type QwenRecognitionProviderConfig = {
  apiKey: string;
  model: string;
};

const QWEN_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

function parseJsonContent(content: string): unknown {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(normalized); } catch { throw new Error("千问未返回有效 JSON"); }
}

function recognitionPrompt(platform: RecognitionInput["expectedPlatform"]) {
  return `你是外卖订单结算识别助手。识别一张${platform === "MEITUAN" ? "美团" : "B家"}订单详情长图，并且只返回一个 JSON 对象，不要 markdown，不要解释。必须包含且仅包含这些字段：platform, orderNumber, dishPrice, packagingFee, platformRedPacket, originalDeliveryFee, deliveryFeeReduction, paidDeliveryFee, merchantSettlementAmount, userPaidAmount, otherPromotion, technicalServiceFee, deliveryServiceFee, merchantRate, confidence。platform 必须为 ${platform}。所有金额字段必须是数字，以元为单位；merchantRate 是小数费率，例如 0.076。无法从图片明确识别的字段不要猜测，返回 null。confidence 为 0 到 1 的数字。`;
}

export function createQwenRecognitionProvider(config: QwenRecognitionProviderConfig): RecognitionProvider {
  return {
    name: "QWEN",
    async recognize(input: RecognitionInput): Promise<RecognitionResult> {
      if (!config.apiKey.trim()) throw new Error("千问 API Key 尚未配置");
      const response = await fetch(QWEN_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: [{
            role: "user",
            content: [
              { type: "image_url", image_url: { url: input.imageDataUrl } },
              { type: "text", text: recognitionPrompt(input.expectedPlatform) },
            ],
          }],
          temperature: 0,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: unknown } }>; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || `千问识别请求失败（${response.status}）`);
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new Error("千问未返回可解析的识别结果");

      const parsed = recognitionSchema.safeParse(parseJsonContent(content));
      if (!parsed.success) throw new Error("字段缺失或金额格式错误");
      if (parsed.data.platform !== input.expectedPlatform) throw new Error("识别平台与上传图片类型不一致");
      return parsed.data;
    },
  };
}
