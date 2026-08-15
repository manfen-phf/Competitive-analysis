import { recognitionRawSchema, type RecognitionRawResult } from "@/lib/validation";
import { createQwenRecognitionProvider } from "@/lib/recognition-provider";

export type QwenRecognitionConfig = {
  endpoint: string;
  apiKey: string;
  model: string;
};

export const qwenRecognitionConfig = (apiKey: string): QwenRecognitionConfig => ({
  endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  apiKey,
  model: "qwen-vl-plus",
});

export function extractJsonContent(content: string): unknown {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(normalized);
  } catch {
    throw new Error("Qwen 未返回有效 JSON");
  }
}

// The upload-to-model workflow is intentionally deferred to P0-3.
export async function recognizeOrderScreenshot(
  imageUrl: string,
  apiKey = "",
  expectedPlatform: "MEITUAN" | "B_JIA" = "MEITUAN",
): Promise<RecognitionRawResult> {
  const provider = createQwenRecognitionProvider({ apiKey, model: qwenRecognitionConfig(apiKey).model });
  return provider.recognize({ imageDataUrl: imageUrl, expectedPlatform });
}

export const recognitionContract = recognitionRawSchema;
