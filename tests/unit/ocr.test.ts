import { describe, expect, it } from "vitest";
import { extractJsonContent, qwenRecognitionConfig } from "../../src/lib/ocr";

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
});