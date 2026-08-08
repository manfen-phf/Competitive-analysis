const extensionByMimeType: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type ScreenshotBucket = {
  put: (key: string, value: ArrayBuffer | Uint8Array, options: {
    httpMetadata: { contentType: string };
    customMetadata: { imageHash: string };
  }) => Promise<unknown>;
  get: (key: string) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer> } | null>;
};

export type ScreenshotReference = {
  r2Key: string;
  imageHash: string;
  imageMimeType: string;
};

export function r2ObjectKey(imageHash: string, imageMimeType: string): string {
  const extension = extensionByMimeType[imageMimeType];
  if (!extension || !/^[a-f0-9]{2,}$/i.test(imageHash)) {
    throw new Error("Invalid screenshot storage metadata");
  }

  const normalizedHash = imageHash.toLowerCase();
  return `screenshots/${normalizedHash.slice(0, 2)}/${normalizedHash}.${extension}`;
}

export async function saveScreenshot(
  bucket: ScreenshotBucket,
  bytes: ArrayBuffer | Uint8Array,
  imageHash: string,
  imageMimeType: string,
): Promise<ScreenshotReference> {
  const r2Key = r2ObjectKey(imageHash, imageMimeType);
  await bucket.put(r2Key, bytes, {
    httpMetadata: { contentType: imageMimeType },
    customMetadata: { imageHash: imageHash.toLowerCase() },
  });

  return { r2Key, imageHash: imageHash.toLowerCase(), imageMimeType };
}

export async function readScreenshot(bucket: ScreenshotBucket, r2Key: string): Promise<ArrayBuffer> {
  const object = await bucket.get(r2Key);
  if (!object) throw new Error("Screenshot not found in R2");
  return object.arrayBuffer();
}
