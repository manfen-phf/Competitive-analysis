export const MAX_SCREENSHOT_BYTES = 1_800_000;

const supportedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const extensionByMimeType: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function assertSupportedScreenshot(bytes: Buffer, mimeType: string) {
  if (!supportedMimeTypes.has(mimeType)) throw new Error("仅支持 PNG、JPG 和 WebP 截图");
  if (bytes.byteLength > MAX_SCREENSHOT_BYTES) throw new Error("截图不能超过 1.8MB");
}

export function cloudStorageObjectPath(hash: string, mimeType: string) {
  const extension = extensionByMimeType[mimeType];
  if (!extension || !/^[a-f0-9]{2,}$/i.test(hash)) throw new Error("无效的截图存储信息");
  return `uploads/${hash.slice(0, 2).toLowerCase()}/${hash.toLowerCase()}.${extension}`;
}

export function isUploadImageTokenValid(storedToken: string, requestedToken: string | null) {
  return Boolean(requestedToken) && requestedToken === storedToken;
}

export function publicUploadImageUrl(origin: string, uploadId: string, token: string) {
  return `${origin.replace(/\/$/, "")}/api/uploads/${uploadId}/image?token=${encodeURIComponent(token)}`;
}

export function imageDataUrl(bytes: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}