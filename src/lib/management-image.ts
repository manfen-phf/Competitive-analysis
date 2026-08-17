import type { D1Database } from "@cloudflare/workers-types";
import type { ScreenshotBucket } from "@/lib/r2-storage";

type UploadImageReference = { r2Key: string; imageMimeType: string };

export async function readManagementImage(db: D1Database, bucket: ScreenshotBucket, uploadImageId: string) {
  const image = await db.prepare('SELECT "r2Key" AS "r2Key", "imageMimeType" AS "imageMimeType" FROM "UploadImage" WHERE "id" = ?')
    .bind(uploadImageId)
    .first<UploadImageReference>();
  if (!image) throw new Error("Upload image not found");

  const object = await bucket.get(image.r2Key);
  if (!object) throw new Error("Source image not found in R2");
  return { bytes: await object.arrayBuffer(), contentType: image.imageMimeType };
}
