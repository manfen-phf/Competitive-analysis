export const MAX_SCREENSHOT_BYTES = 1_800_000;

const supportedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export function assertSupportedScreenshot(bytes: Buffer, mimeType: string) {
  if (!supportedMimeTypes.has(mimeType)) throw new Error("仅支持 PNG、JPG 和 WebP 截图");
  if (bytes.byteLength > MAX_SCREENSHOT_BYTES) throw new Error("截图不能超过 1.8MB");
}

export function publicUploadImageUrl(origin: string, uploadId: string, token: string) {
  return `${origin.replace(/\/$/, "")}/api/uploads/${uploadId}/image?token=${encodeURIComponent(token)}`;
}
