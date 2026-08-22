import type { SessionUser } from "@/lib/auth";
import { validateCollectionForConfirmation, type UploadPlatform } from "@/lib/collections";
import { calculateOrderDerivedValues } from "@/lib/order-calculations";
import { canMutateCollection } from "@/lib/permissions";

type ConfirmableUpload = {
  id: string;
  platform: string | null;
  recognitionStatus: string;
  recognitionResult: string | null;
  uploadedAt: Date;
};

export type ConfirmableCollection = {
  id: string;
  merchantId: string;
  merchantName: string;
  city: string;
  bdName: string;
  originalDeliveryFee: number;
  status: string;
  uploads: ConfirmableUpload[];
};

export type CollectionReviewInput = {
  platform: UploadPlatform;
  goodsTotal: number;
  packagingFee?: number | null;
  merchantActivity?: number | null;
  otherPromotion?: number | null;
  deliveryFeeReduction?: number | null;
  platformRedPacket?: number | null;
  platformRedPacketMerchantShare?: number | null;
  merchantSettlementAmount?: number | null;
  technicalServiceFee?: number | null;
  deliveryServiceFee?: number | null;
  orderNumber?: string | null;
};

type Transaction = {
  orderRecord: { create: (input: { data: Record<string, unknown> }) => Promise<unknown>; count: (input: { where: { upload: { collectionId: string } } }) => Promise<number> };
  collectionTask: { updateMany: (input: { where: { id: string; status: string }; data: { status: string } }) => Promise<{ count: number}>; findUnique: (input: { where: { id: string }; select: { status: true } }) => Promise<{ status: string } | null> };
};

export type ConfirmationDatabase = {
  $transaction: <T>(callback: (transaction: Transaction) => Promise<T>) => Promise<T>;
};

export type ConfirmCollectionInput = {
  collection: ConfirmableCollection;
  user: SessionUser;
  reviews: CollectionReviewInput[];
  database: ConfirmationDatabase;
};

type ConfirmedOrder = Record<string, unknown>;

function recognizedGoodsTotal(value: string | null) {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as { dishPrice?: unknown; packagingFee?: unknown; goodsTotal?: unknown };
    if (typeof parsed.goodsTotal === "number" && Number.isFinite(parsed.goodsTotal)) return parsed.goodsTotal;
    if (typeof parsed.dishPrice === "number" && Number.isFinite(parsed.dishPrice) && typeof parsed.packagingFee === "number" && Number.isFinite(parsed.packagingFee)) {
      return parsed.dishPrice + parsed.packagingFee;
    }
  } catch { /* an invalid OCR payload cannot be confirmed */ }
  return undefined;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function amount(value: number | null | undefined, field: string, allowNegative = false) {
  const resolved = value ?? 0;
  if (!isFiniteNumber(resolved) || (!allowNegative && resolved < 0)) throw new Error(`${field}金额无效`);
  return resolved;
}

function reviewForPlatform(reviews: CollectionReviewInput[], platform: UploadPlatform) {
  const matching = reviews.filter((review) => review.platform === platform);
  return matching.length === 1 ? matching[0] : undefined;
}

function successfulUploadForPlatform(collection: ConfirmableCollection, platform: UploadPlatform) {
  return collection.uploads.find((upload) => upload.platform === platform && upload.recognitionStatus === "SUCCEEDED");
}

function toOrderData(collection: ConfirmableCollection, upload: ConfirmableUpload, review: CollectionReviewInput): ConfirmedOrder {
  const goodsTotal = amount(review.goodsTotal, "商品总价");
  const packagingFee = amount(review.packagingFee, "打包费");
  if (packagingFee > goodsTotal) throw new Error("打包费不能大于商品总价");

  const merchantActivity = amount(review.merchantActivity, "商家活动款");
  const otherPromotion = amount(review.otherPromotion, "其他活动");
  const deliveryFeeReduction = amount(review.deliveryFeeReduction, "减配送费");
  const platformRedPacket = amount(review.platformRedPacket, "平台红包抵扣金额");
  const platformRedPacketMerchantShare = amount(review.platformRedPacketMerchantShare, "平台红包商家承担");
  const merchantSettlementAmount = amount(review.merchantSettlementAmount, "结算金额", true);
  const technicalServiceFee = amount(review.technicalServiceFee, "技术服务费");
  const deliveryServiceFee = amount(review.deliveryServiceFee, "配送服务费");
  const derived = calculateOrderDerivedValues({
    goodsTotal,
    packagingFee,
    merchantActivity,
    originalDeliveryFee: collection.originalDeliveryFee,
    deliveryFeeReduction,
    technicalServiceFee,
    deliveryServiceFee,
  });

  return {
    uploadId: upload.id,
    uploadedAt: upload.uploadedAt,
    orderNumber: review.orderNumber?.trim() || null,
    platform: review.platform,
    merchantId: collection.merchantId,
    merchantName: collection.merchantName,
    city: collection.city,
    bdName: collection.bdName,
    dishPrice: derived.dishPrice,
    packagingFee,
    platformRedPacket,
    platformRedPacketMerchantShare,
    originalDeliveryFee: collection.originalDeliveryFee,
    deliveryFeeReduction,
    paidDeliveryFee: derived.paidDeliveryFee,
    merchantSettlementAmount,
    userPaidAmount: derived.userPaidAmount,
    otherPromotion,
    technicalServiceFee,
    deliveryServiceFee,
    merchantRate: derived.merchantRate,
  };
}

export async function confirmCollection({ collection, user, reviews, database }: ConfirmCollectionInput) {
  if (!canMutateCollection(user, collection)) return { ok: false as const, error: "无权操作此采集任务" };
  if (collection.status === "CONFIRMED") return { ok: true as const, orderCount: 2, alreadyConfirmed: true as const };

  const draft = {
    merchantId: collection.merchantId,
    city: collection.city,
    bdName: collection.bdName,
    originalDeliveryFee: collection.originalDeliveryFee,
    images: (["MEITUAN", "B_JIA"] as const).map((platform) => {
      const review = reviewForPlatform(reviews, platform);
      const upload = successfulUploadForPlatform(collection, platform);
      return {
        platform,
        recognitionStatus: upload?.recognitionStatus === "SUCCEEDED" ? "SUCCEEDED" as const : "FAILED" as const,
        recognitionResult: { goodsTotal: review?.goodsTotal ?? recognizedGoodsTotal(upload?.recognitionResult ?? null) },
      };
    }),
  };
  const validation = validateCollectionForConfirmation(draft);
  if (!validation.ok) return { ok: false as const, error: "请先完成美团和B家两张截图的识别", fieldErrors: validation.fieldErrors };

  const meituanUpload = successfulUploadForPlatform(collection, "MEITUAN");
  const bJiaUpload = successfulUploadForPlatform(collection, "B_JIA");
  const meituanReview = reviewForPlatform(reviews, "MEITUAN");
  const bJiaReview = reviewForPlatform(reviews, "B_JIA");
  if (!meituanUpload || !bJiaUpload || !meituanReview || !bJiaReview) {
    return { ok: false as const, error: "请补全两个平台的校对字段" };
  }

  try {
    const orders = [toOrderData(collection, meituanUpload, meituanReview), toOrderData(collection, bJiaUpload, bJiaReview)];
    const result = await database.$transaction(async (transaction) => {
      const transition = await transaction.collectionTask.updateMany({ where: { id: collection.id, status: "READY_TO_CONFIRM" }, data: { status: "CONFIRMED" } });
      if (transition.count === 0) {
        const [persisted, orderCount] = await Promise.all([transaction.collectionTask.findUnique({ where: { id: collection.id }, select: { status: true } }), transaction.orderRecord.count({ where: { upload: { collectionId: collection.id } } })]);
        if (persisted?.status === "CONFIRMED" && orderCount === 2) return { alreadyConfirmed: true as const };
        return { conflict: true as const };
      }
      await Promise.all(orders.map((data) => transaction.orderRecord.create({ data })));
      return { alreadyConfirmed: false as const };
    });
    if (result.conflict) return { ok: false as const, error: "采集任务当前不可确认" };
    return { ok: true as const, orderCount: orders.length, ...(result.alreadyConfirmed ? { alreadyConfirmed: true as const } : {}) };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "确认入库失败" };
  }
}
