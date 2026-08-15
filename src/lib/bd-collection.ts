import { assertSupportedScreenshot } from "@/lib/storage";
import { saveScreenshot, type ScreenshotBucket } from "@/lib/r2-storage";
import type { D1Database } from "@cloudflare/workers-types";

export type CollectionPlatform = "MEITUAN" | "B_JIA";

export type CollectionImage = {
  platform: CollectionPlatform;
  imageHash: string;
  imageMimeType: string;
  bytes: Uint8Array;
};

export async function validateCollectionUpload(images: CollectionImage[]): Promise<void> {
  if (images.length !== 2 || !images.some((image) => image.platform === "MEITUAN") || !images.some((image) => image.platform === "B_JIA")) {
    throw new Error("美团和 B 家截图必须同时上传");
  }
  if (images[0].imageHash === images[1].imageHash) throw new Error("两张截图不能是同一张图片");
  for (const image of images) assertSupportedScreenshot(image.bytes, image.imageMimeType);
}

export type CreateCollectionInput = {
  db: D1Database;
  bucket: ScreenshotBucket;
  bdUserId: string;
  merchantId: string;
  originalDeliveryFee: number;
  images: CollectionImage[];
};

export type CollectionCreateResult = {
  collectionSessionId: string;
  imageCount: 2;
};

export async function createCollection(input: CreateCollectionInput): Promise<CollectionCreateResult> {
  await validateCollectionUpload(input.images);
  if (!Number.isFinite(input.originalDeliveryFee) || input.originalDeliveryFee < 0) throw new Error("请填写有效的原价配送费");

  const assignment = await input.db.prepare(`SELECT 1 AS assigned
    FROM "MerchantBdAssignment"
    WHERE "merchantId" = ? AND "bdUserId" = ? AND "effectiveTo" IS NULL
    LIMIT 1`).bind(input.merchantId, input.bdUserId).all<{ assigned: number }>();
  if (assignment.results.length === 0) throw new Error("只能为自己负责的商家采集");

  const duplicate = await input.db.prepare(`SELECT "id" FROM "UploadImage" WHERE "imageHash" IN (?, ?) LIMIT 1`)
    .bind(input.images[0].imageHash, input.images[1].imageHash)
    .all<{ id: string }>();
  if (duplicate.results.length > 0) throw new Error("该截图已采集过，不能重复上传");

  const sessionId = `collection:${crypto.randomUUID()}`;
  const imageIds = input.images.map(() => `image:${crypto.randomUUID()}`);
  const saved = [] as Array<{ r2Key: string; imageHash: string; imageMimeType: string }>;

  try {
    for (const image of input.images) saved.push(await saveScreenshot(input.bucket, image.bytes, image.imageHash, image.imageMimeType));
    const statements = [
      input.db.prepare(`INSERT INTO "CollectionSession" ("id", "merchantId", "bdUserId", "originalDeliveryFee", "status") VALUES (?, ?, ?, ?, 'UPLOADED')`)
        .bind(sessionId, input.merchantId, input.bdUserId, input.originalDeliveryFee),
      ...input.images.map((image, index) => input.db.prepare(`INSERT INTO "UploadImage" ("id", "collectionSessionId", "platform", "r2Key", "imageHash", "imageMimeType", "uploadedById") VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .bind(imageIds[index], sessionId, image.platform, saved[index].r2Key, saved[index].imageHash, saved[index].imageMimeType, input.bdUserId)),
    ];
    await input.db.batch(statements);
  } catch (error) {
    await Promise.all(saved.map((item) => input.bucket.delete?.(item.r2Key)));
    throw error;
  }

  return { collectionSessionId: sessionId, imageCount: 2 };
}
