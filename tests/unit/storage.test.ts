import { describe, expect, it } from "vitest";
import * as storage from "../../src/lib/storage";
import { r2ObjectKey, readScreenshot, saveScreenshot } from "../../src/lib/r2-storage";

type ScreenshotStorage = typeof storage & {
  assertSupportedScreenshot?: (bytes: Buffer, mimeType: string) => void;
};

describe("R2 screenshot storage", () => {
  it("rejects screenshots larger than the upload limit", () => {
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
  it("encodes screenshots as a Qwen-compatible data URL for local development", () => {
    expect(storage.imageDataUrl(Buffer.from([0xff, 0xd8]), "image/jpeg"))
      .toBe("data:image/jpeg;base64,/9g=");
  });

  it("creates a deterministic R2 key without storing image bytes in D1", () => {
    expect(r2ObjectKey("ab12cd34", "image/png")).toBe("screenshots/ab/ab12cd34.png");
  });

  it("writes original bytes to R2 and returns only D1-safe metadata", async () => {
    const calls: Array<{ key: string; value: Uint8Array; contentType: string; imageHash: string }> = [];
    const bucket = {
      put: async (key: string, value: ArrayBuffer | Uint8Array, options: { httpMetadata: { contentType: string }; customMetadata: { imageHash: string } }) => {
        calls.push({ key, value: new Uint8Array(value), contentType: options.httpMetadata.contentType, imageHash: options.customMetadata.imageHash });
      },
      get: async () => null,
    };

    await expect(saveScreenshot(bucket, new Uint8Array([1, 2]), "ab12cd34", "image/png")).resolves.toEqual({
      r2Key: "screenshots/ab/ab12cd34.png",
      imageHash: "ab12cd34",
      imageMimeType: "image/png",
    });
    expect(calls).toEqual([{ key: "screenshots/ab/ab12cd34.png", value: new Uint8Array([1, 2]), contentType: "image/png", imageHash: "ab12cd34" }]);
  });

  it("reads a screenshot from R2 by object key", async () => {
    const bucket = {
      put: async () => undefined,
      get: async (key: string) => key === "screenshots/a/a.png" ? { arrayBuffer: async () => new Uint8Array([3, 4]).buffer } : null,
    };

    await expect(readScreenshot(bucket, "screenshots/a/a.png")).resolves.toEqual(new Uint8Array([3, 4]).buffer);
    await expect(readScreenshot(bucket, "missing")).rejects.toThrow("Screenshot not found in R2");
  });
});
