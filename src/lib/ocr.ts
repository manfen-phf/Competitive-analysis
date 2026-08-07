import { recognitionSchema, type RecognitionResult } from "@/lib/validation";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

const extractionPrompt = `你是外卖订单结算截图的数据提取器。只输出一个 JSON 对象，不要 Markdown，不要解释。字段必须全部存在：platform（MEITUAN 或 B_JIA）、orderNumber、dishPrice、packagingFee、platformRedPacket、originalDeliveryFee、deliveryFeeReduction、paidDeliveryFee、merchantSettlementAmount、userPaidAmount、otherPromotion、technicalServiceFee、deliveryServiceFee、merchantRate、confidence。所有金额均为非负数字；merchantRate 用百分比数字表示（如 7.6），confidence 为 0 到 1。无法确定任意字段时仍输出 JSON，但将 confidence 设为 0。`;

export const qwenRecognitionConfig = (apiKey: string) => ({
  endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  apiKey,
  model: "qwen-vl-plus",
});

export function extractJsonContent(content: string): unknown {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(normalized); } catch { throw new Error("Qwen 未返回有效 JSON"); }
}

export async function recognizeOrderScreenshot(imageUrl: string): Promise<RecognitionResult> {
  const apiKey = await getRuntimeSecret("QWEN_API_KEY");
  if (!apiKey) throw new Error("尚未配置 QWEN_API_KEY，无法开始图片识别");
  const config = qwenRecognitionConfig(apiKey);
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      max_tokens: 1200,
      messages: [
        { role: "system", content: extractionPrompt },
        { role: "user", content: [
          { type: "text", text: "请识别这张订单详情截图，并严格按要求返回 JSON。" },
          { type: "image_url", image_url: { url: imageUrl } },
        ] },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Qwen-VL-Plus 识别服务异常（HTTP ${response.status}）`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("Qwen-VL-Plus 未返回识别结果");
  const parsed = recognitionSchema.safeParse(extractJsonContent(content));
  if (!parsed.success) throw new Error("Qwen-VL-Plus 返回字段不完整或格式无效");
  return parsed.data;
}

export const recognitionContract = recognitionSchema;