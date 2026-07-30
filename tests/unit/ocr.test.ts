import { describe, expect, it } from "vitest";
import { extractJsonContent } from "../../src/lib/ocr";

describe("extractJsonContent", () => {
  it("accepts a JSON response wrapped in a markdown fence", () => {
    expect(extractJsonContent("```json\n{\"platform\":\"MEITUAN\"}\n```")).toEqual({ platform: "MEITUAN" });
  });

  it("rejects non JSON model output", () => {
    expect(() => extractJsonContent("无法识别")).toThrow("未返回有效 JSON");
  });
});
