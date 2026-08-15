import type { D1Database } from "@cloudflare/workers-types";
import type { CollectionPlatform } from "@/lib/bd-collection";
import type { RecognitionProvider } from "@/lib/recognition-provider";
import { recognitionSchema, type RecognitionResult } from "@/lib/validation";
import { readScreenshot, type ScreenshotBucket } from "@/lib/r2-storage";

type OwnedImage = {
  imageId: string;
  platform: CollectionPlatform;
  r2Key: string;
  imageMimeType: string;
};

type RecognitionWrite = { image: OwnedImage; result?: RecognitionResult; reason?: string };

export type CollectionRecognitionOutcome = {
  status: "RECOGNIZED" | "RECOGNITION_FAILED";
  results: RecognitionWrite[];
};

export type RecognizeCollectionInput = {
  db: D1Database;
  bucket: ScreenshotBucket;
  collectionSessionId: string;
  bdUserId: string;
  provider: RecognitionProvider;
};

export type ConfirmCollectionInput = {
  db: D1Database;
  collectionSessionId: string;
  bdUserId: string;
  results: RecognitionResult[];
};

export type CollectionDetail = {
  collectionSessionId: string;
  status: string;
  merchantName: string;
  merchantCode: string;
  cityName: string;
  images: Array<{
    imageId: string;
    platform: CollectionPlatform;
    r2Key: string;
    recognitionStatus: string | null;
    structuredResult: RecognitionResult | null;
    failureReason: string | null;
  }>;
};

async function ownedImages(db: D1Database, collectionSessionId: string, bdUserId: string): Promise<OwnedImage[]> {
  const found = await db.prepare(`SELECT i."id" AS "imageId", i."platform" AS "platform", i."r2Key" AS "r2Key", i."imageMimeType" AS "imageMimeType"
    FROM "CollectionSession" s
    JOIN "UploadImage" i ON i."collectionSessionId" = s."id"
    WHERE s."id" = ? AND s."bdUserId" = ?
    ORDER BY CASE i."platform" WHEN 'MEITUAN' THEN 0 ELSE 1 END`).bind(collectionSessionId, bdUserId).all<OwnedImage>();
  if (found.results.length !== 2 || !found.results.some((item) => item.platform === "MEITUAN") || !found.results.some((item) => item.platform === "B_JIA")) {
    throw new Error("未找到属于当前 BD 的完整双平台采集任务");
  }
  return found.results;
}

function dataUrl(bytes: ArrayBuffer, mimeType: string) {
  const data = new Uint8Array(bytes);
  let binary = "";
  for (let index = 0; index < data.length; index += 0x8000) binary += String.fromCharCode(...data.subarray(index, index + 0x8000));
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function validConfirmedResult(result: RecognitionResult): RecognitionResult {
  const parsed = recognitionSchema.safeParse(result);
  if (!parsed.success) throw new Error("字段缺失或金额格式错误");
  const value = parsed.data;
  if (Math.abs(value.originalDeliveryFee - value.deliveryFeeReduction - value.paidDeliveryFee) > 0.02) {
    throw new Error("配送费金额关系不一致");
  }
  return value;
}

function ensurePair(results: RecognitionResult[]) {
  if (results.length !== 2 || !results.some((result) => result.platform === "MEITUAN") || !results.some((result) => result.platform === "B_JIA")) {
    throw new Error("美团和 B 家识别结果必须同时确认");
  }
  return results.map(validConfirmedResult);
}

export async function recognizeCollection(input: RecognizeCollectionInput): Promise<CollectionRecognitionOutcome> {
  const images = await ownedImages(input.db, input.collectionSessionId, input.bdUserId);
  const writes: RecognitionWrite[] = [];
  for (const image of images) {
    try {
      const bytes = await readScreenshot(input.bucket, image.r2Key);
      const result = await input.provider.recognize({ imageDataUrl: dataUrl(bytes, image.imageMimeType), expectedPlatform: image.platform });
      writes.push({ image, result: validConfirmedResult(result) });
    } catch (error) {
      writes.push({ image, reason: error instanceof Error ? error.message : "千问识别失败" });
    }
  }

  const isSuccess = writes.every((item) => item.result);
  const statements = writes.flatMap((item) => {
    const resultId = `recognition:${crypto.randomUUID()}`;
    const recognition = item.result
      ? input.db.prepare(`INSERT INTO "RecognitionResult" ("id", "uploadImageId", "provider", "status", "rawJson", "structuredJson", "confidence", "recognizedAt") VALUES (?, ?, 'QWEN', 'SUCCESS', ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT("uploadImageId") DO UPDATE SET "provider" = excluded."provider", "status" = excluded."status", "rawJson" = excluded."rawJson", "structuredJson" = excluded."structuredJson", "confidence" = excluded."confidence", "recognizedAt" = CURRENT_TIMESTAMP`)
        .bind(resultId, item.image.imageId, JSON.stringify(item.result), JSON.stringify(item.result), item.result.confidence)
      : input.db.prepare(`INSERT INTO "RecognitionResult" ("id", "uploadImageId", "provider", "status", "rawJson") VALUES (?, ?, 'QWEN', 'FAILED', ?)
          ON CONFLICT("uploadImageId") DO UPDATE SET "provider" = excluded."provider", "status" = excluded."status", "rawJson" = excluded."rawJson", "structuredJson" = NULL, "confidence" = NULL, "recognizedAt" = NULL`)
        .bind(resultId, item.image.imageId, JSON.stringify({ reason: item.reason }));
    const failure = item.result ? [] : [input.db.prepare(`INSERT INTO "RecognitionFailureV1" ("id", "uploadImageId", "reason") VALUES (?, ?, ?)`)
      .bind(`recognition-failure:${crypto.randomUUID()}`, item.image.imageId, item.reason)];
    return [recognition, ...failure];
  });
  statements.push(input.db.prepare(`UPDATE "CollectionSession" SET "status" = ? WHERE "id" = ?`).bind(isSuccess ? "RECOGNIZED" : "RECOGNITION_FAILED", input.collectionSessionId));
  await input.db.batch(statements);
  return { status: isSuccess ? "RECOGNIZED" : "RECOGNITION_FAILED", results: writes };
}

export async function confirmCollection(input: ConfirmCollectionInput): Promise<void> {
  const images = await ownedImages(input.db, input.collectionSessionId, input.bdUserId);
  const confirmed = ensurePair(input.results);
  const imageByPlatform = new Map(images.map((image) => [image.platform, image]));
  const statements = confirmed.map((result) => {
    const image = imageByPlatform.get(result.platform);
    if (!image) throw new Error("确认结果与上传平台不一致");
    return input.db.prepare(`INSERT INTO "ConfirmedOrder" ("id", "collectionSessionId", "uploadImageId", "platform", "orderNumber", "dishPrice", "packagingFee", "platformRedPacket", "originalDeliveryFee", "deliveryFeeReduction", "paidDeliveryFee", "merchantSettlementAmount", "userPaidAmount", "otherPromotion", "technicalServiceFee", "deliveryServiceFee", "merchantRate", "confirmedById", "confirmedAt")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT("uploadImageId") DO UPDATE SET "orderNumber" = excluded."orderNumber", "dishPrice" = excluded."dishPrice", "packagingFee" = excluded."packagingFee", "platformRedPacket" = excluded."platformRedPacket", "originalDeliveryFee" = excluded."originalDeliveryFee", "deliveryFeeReduction" = excluded."deliveryFeeReduction", "paidDeliveryFee" = excluded."paidDeliveryFee", "merchantSettlementAmount" = excluded."merchantSettlementAmount", "userPaidAmount" = excluded."userPaidAmount", "otherPromotion" = excluded."otherPromotion", "technicalServiceFee" = excluded."technicalServiceFee", "deliveryServiceFee" = excluded."deliveryServiceFee", "merchantRate" = excluded."merchantRate", "confirmedById" = excluded."confirmedById", "confirmedAt" = CURRENT_TIMESTAMP`)
      .bind(`confirmed-order:${crypto.randomUUID()}`, input.collectionSessionId, image.imageId, result.platform, result.orderNumber, result.dishPrice, result.packagingFee, result.platformRedPacket, result.originalDeliveryFee, result.deliveryFeeReduction, result.paidDeliveryFee, result.merchantSettlementAmount, result.userPaidAmount, result.otherPromotion, result.technicalServiceFee, result.deliveryServiceFee, result.merchantRate, input.bdUserId);
  });
  statements.push(input.db.prepare(`UPDATE "CollectionSession" SET "status" = 'CONFIRMED' WHERE "id" = ?`).bind(input.collectionSessionId));
  await input.db.batch(statements);
}

export async function getCollectionDetail(db: D1Database, collectionSessionId: string, bdUserId: string): Promise<CollectionDetail> {
  type DetailRow = {
    collectionSessionId: string; status: string; merchantName: string; merchantCode: string; cityName: string;
    imageId: string; platform: CollectionPlatform; r2Key: string; recognitionStatus: string | null;
    structuredJson: string | null; rawJson: string | null;
  };
  const result = await db.prepare(`SELECT s."id" AS "collectionSessionId", s."status" AS "status", m."name" AS "merchantName", m."merchantCode" AS "merchantCode", c."name" AS "cityName",
    i."id" AS "imageId", i."platform" AS "platform", i."r2Key" AS "r2Key", r."status" AS "recognitionStatus", r."structuredJson" AS "structuredJson", r."rawJson" AS "rawJson"
    FROM "CollectionSession" s
    JOIN "Merchant" m ON m."id" = s."merchantId"
    JOIN "City" c ON c."id" = m."cityId"
    JOIN "UploadImage" i ON i."collectionSessionId" = s."id"
    LEFT JOIN "RecognitionResult" r ON r."uploadImageId" = i."id"
    WHERE s."id" = ? AND s."bdUserId" = ?
    ORDER BY CASE i."platform" WHEN 'MEITUAN' THEN 0 ELSE 1 END`).bind(collectionSessionId, bdUserId).all<DetailRow>();
  const first = result.results[0];
  if (!first) throw new Error("未找到属于当前 BD 的采集任务");
  return {
    collectionSessionId: first.collectionSessionId,
    status: first.status,
    merchantName: first.merchantName,
    merchantCode: first.merchantCode,
    cityName: first.cityName,
    images: result.results.map((row) => {
      let structuredResult: RecognitionResult | null = null;
      let failureReason: string | null = null;
      try { if (row.structuredJson) structuredResult = recognitionSchema.parse(JSON.parse(row.structuredJson)); }
      catch { failureReason = "识别结果格式异常，请重新识别"; }
      if (!failureReason && row.recognitionStatus === "FAILED") {
        try { failureReason = String((JSON.parse(row.rawJson ?? "{}") as { reason?: unknown }).reason ?? "识别失败"); }
        catch { failureReason = "识别失败"; }
      }
      return { imageId: row.imageId, platform: row.platform, r2Key: row.r2Key, recognitionStatus: row.recognitionStatus, structuredResult, failureReason };
    }),
  };
}
