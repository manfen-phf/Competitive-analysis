import { recognitionRawSchema, type RecognitionRawResult } from "@/lib/validation";

export type RecognitionInput = { imageDataUrl: string; expectedPlatform: "MEITUAN" | "B_JIA" };
export type RecognitionProvider = { name: "QWEN"; recognize: (input: RecognitionInput) => Promise<RecognitionRawResult> };
export type QwenRecognitionProviderConfig = { apiKey: string; model: string };

const QWEN_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

function parseJsonContent(content: string): unknown {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(normalized); } catch { throw new Error("千问未返回有效 JSON"); }
}

function recognitionPrompt(platform: RecognitionInput["expectedPlatform"]) {
  const platformName = platform === "MEITUAN" ? "美团" : "B家";
  return `你是外卖订单结算截图识别助手。识别一张${platformName}订单详情长图，只返回一个 JSON 对象，不要 markdown 或解释。
JSON 必须包含以下字段：platform, goodsTotal, orderNumber, packagingFee, merchantActivityAmount, otherActivityAmount, deliveryFeeReduction, platformRedPacketAmount, platformRedPacketMerchantShare, merchantSettlementAmount, technicalServiceFee, deliveryServiceFee, confidence。
platform 必须为 ${platform}。goodsTotal 是“商品总价”，它必须是数值；若图片无法看清商品总价，返回 null。其他字段在图片没有明确展示时必须返回 null，绝不能猜测，金额单位为元。
字段规则：packagingFee=打包费或餐盒费；merchantActivityAmount：美团取“商家对顾客的活动补贴”中商家承担总额，B家取页面顶部“商家承担活动款”总额；otherActivityAmount=非平台红包、非配送费活动的商家承担金额，B家“店铺满减”等归入此字段，例如“店铺满减｜满58元减3元，商家承担3元”返回3；deliveryFeeReduction=减配送费中商家承担金额；platformRedPacketAmount=支付红包或平台红包抵扣总金额；platformRedPacketMerchantShare=红包明细中的商家承担；merchantSettlementAmount=结算金额；technicalServiceFee：美团取“技术与运营服务费”总额，B家取“技术服务费”；deliveryServiceFee=配送服务费。orderNumber 取订单号；confidence 为 0 到 1 的数值。`;
}

export function createQwenRecognitionProvider(config: QwenRecognitionProviderConfig): RecognitionProvider {
  return {
    name: "QWEN",
    async recognize(input) {
      if (!config.apiKey.trim()) throw new Error("千问 API Key 尚未配置");
      const response = await fetch(QWEN_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.model, messages: [{ role: "user", content: [
          { type: "image_url", image_url: { url: input.imageDataUrl } },
          { type: "text", text: recognitionPrompt(input.expectedPlatform) },
        ] }], temperature: 0 }),
      });
      const payload = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: unknown } }>; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || `千问识别请求失败（${response.status}）`);
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new Error("千问未返回可解析的识别结果");
      const parsed = recognitionRawSchema.safeParse(parseJsonContent(content));
      if (!parsed.success || parsed.data.goodsTotal === null) throw new Error("未识别到商品总价");
      if (parsed.data.platform !== input.expectedPlatform) throw new Error("识别平台与上传图片类型不一致");
      return parsed.data;
    },
  };
}
