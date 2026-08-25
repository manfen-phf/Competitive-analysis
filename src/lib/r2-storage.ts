import { getCloudflareContext } from "@opennextjs/cloudflare";

import { cloudStorageObjectPath } from "@/lib/storage";

type ScreenshotBucket = {
  put: (key: string, value: Buffer, options: { httpMetadata: { contentType: string } }) => Promise<unknown>;
  get: (key: string) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer> } | null>;
};

async function screenshotBucket(): Promise<ScreenshotBucket> {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as Record<string, unknown>).SCREENSHOTS;
  if (!bucket || typeof (bucket as ScreenshotBucket).get !== "function" || typeof (bucket as ScreenshotBucket).put !== "function") {
    throw new Error("R2 截图存储尚未配置");
  }
  return bucket as ScreenshotBucket;
}

export async function saveScreenshotToR2(bytes: Buffer, mimeType: string, hash: string) {
  const key = cloudStorageObjectPath(hash, mimeType);
  await (await screenshotBucket()).put(key, bytes, { httpMetadata: { contentType: mimeType } });
  return key;
}

export async function readScreenshotFromR2(imageFileId: string) {
  const object = await (await screenshotBucket()).get(imageFileId);
  if (!object) throw new Error("R2 中未找到截图");
  return Buffer.from(await object.arrayBuffer());
}
