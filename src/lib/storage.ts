import type { R2Bucket } from "@cloudflare/workers-types";

declare global { interface CloudflareEnv { ORDER_IMAGES?: R2Bucket } }

const extensionFor = (mimeType: string) => ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[mimeType]);

async function imageBucket() {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  if (!env.ORDER_IMAGES) throw new Error("截图存储未配置：请绑定 Cloudflare R2 存储桶");
  return env.ORDER_IMAGES;
}

export async function saveUploadImage(uploadId: string, bytes: Buffer, mimeType: string) {
  const extension = extensionFor(mimeType);
  if (!extension) throw new Error("仅支持 PNG、JPG 和 WebP 截图");
  const imagePath = `uploads/${uploadId}.${extension}`;
  await (await imageBucket()).put(imagePath, bytes, { httpMetadata: { contentType: mimeType } });
  return imagePath;
}

export async function readUploadImage(imagePath: string) {
  return (await imageBucket()).get(imagePath);
}

export function publicUploadImageUrl(uploadId: string, token: string) {
  const appUrl = process.env.PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) throw new Error("尚未配置 PUBLIC_APP_URL，Agnes 无法访问待识别截图");
  return `${appUrl}/api/uploads/${uploadId}/image?token=${encodeURIComponent(token)}`;
}
