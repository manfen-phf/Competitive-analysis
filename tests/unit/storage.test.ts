import { describe, expect, it } from "vitest";
import * as storage from "../../src/lib/storage";

type ScreenshotStorage = typeof storage & {
  assertSupportedScreenshot?: (bytes: Buffer, mimeType: string) => void;
};

describe("D1 screenshot storage", () => {
  it("rejects screenshots larger than the D1-safe limit", () => {
    const assertSupportedScreenshot = (storage as ScreenshotStorage).assertSupportedScreenshot;
    expect(typeof assertSupportedScreenshot).toBe("function");
    expect(() => assertSupportedScreenshot?.(Buffer.alloc(1_800_001), "image/png"))
      .toThrow("截图不能超过 1.8MB");
  });

  it("rejects unsupported image formats", () => {
    const assertSupportedScreenshot = (storage as ScreenshotStorage).assertSupportedScreenshot;
    expect(() => assertSupportedScreenshot?.(Buffer.from([1]), "image/gif"))
      .toThrow("仅支持 PNG、JPG 和 WebP 截图");
  });
});
