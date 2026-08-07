import { describe, expect, it } from "vitest";
import { assertSupportedScreenshot } from "../../src/lib/storage";

describe("temporary screenshot input", () => {
  it("rejects screenshots larger than the recognition limit", () => {
    expect(() => assertSupportedScreenshot(Buffer.alloc(1_800_001), "image/png"))
      .toThrow("截图不能超过 1.8MB");
  });
});