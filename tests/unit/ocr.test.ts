import { describe, expect, it } from "vitest";
import { extractJsonContent, qwenRecognitionConfig } from "../../src/lib/ocr";
import { createQwenRecognitionProvider } from "../../src/lib/recognition-provider";

describe("extractJsonContent", () => {
  it("accepts a JSON response wrapped in a markdown fence", () => {
    expect(extractJsonContent("```json\n{\"platform\":\"MEITUAN\"}\n```")).toEqual({ platform: "MEITUAN" });
  });

  it("rejects non JSON model output", () => {
    expect(() => extractJsonContent("无法识别")).toThrow("未返回有效 JSON");
  });

  it("uses Qwen-VL-Plus through DashScope compatible API", () => {
    expect(qwenRecognitionConfig("test-key")).toEqual({
      endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      apiKey: "test-key",
      model: "qwen-vl-plus",
    });
  });

  it("exposes a Qwen recognition provider without enabling recognition before P0-3", async () => {
    const provider = createQwenRecognitionProvider({ apiKey: "test-key", model: "qwen-vl-plus" });

    expect(provider.name).toBe("QWEN");
    await expect(provider.recognize({ imageDataUrl: "data:image/png;base64,AA==" })).rejects.toThrow("P0-3");
  });
});
