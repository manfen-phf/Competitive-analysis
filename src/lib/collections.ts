export const collectionStatuses = [
  "DRAFT",
  "UPLOADING",
  "RECOGNIZING",
  "READY_TO_CONFIRM",
  "CONFIRMED",
  "FAILED",
] as const;

export const uploadPlatforms = ["MEITUAN", "B_JIA"] as const;
export const recognitionStatuses = ["PENDING", "PROCESSING", "SUCCEEDED", "FAILED", "DUPLICATE"] as const;

export type CollectionStatus = typeof collectionStatuses[number];
export type UploadPlatform = typeof uploadPlatforms[number];
export type RecognitionStatus = typeof recognitionStatuses[number];

export type PlatformImage = {
  platform: UploadPlatform;
  recognitionStatus: RecognitionStatus;
  recognitionResult?: { goodsTotal?: number | null } | null;
};

export type CollectionDraft = {
  merchantId: string;
  city: string;
  bdName: string;
  originalDeliveryFee: number;
  images: PlatformImage[];
};

export type CollectionFieldErrors = Partial<Record<UploadPlatform, Partial<Record<"image" | "goodsTotal", string>>>>;

export type CollectionValidationResult = {
  ok: boolean;
  fieldErrors: CollectionFieldErrors;
};

const platformLabels: Record<UploadPlatform, string> = {
  MEITUAN: "美团",
  B_JIA: "B家",
};

function fieldErrorForPlatform(images: PlatformImage[], platform: UploadPlatform): CollectionFieldErrors {
  const matchingImages = images.filter((image) => image.platform === platform);
  const successfulImage = matchingImages.find((image) => image.recognitionStatus === "SUCCEEDED");

  if (!successfulImage) {
    return {
      [platform]: {
        image: matchingImages.length === 0
          ? `请上传${platformLabels[platform]}订单截图`
          : `${platformLabels[platform]}截图尚未识别成功`,
      },
    };
  }

  const goodsTotal = successfulImage.recognitionResult?.goodsTotal;
  if (typeof goodsTotal !== "number" || !Number.isFinite(goodsTotal)) {
    return { [platform]: { goodsTotal: "请补充商品总价" } };
  }

  return {};
}

export function validateCollectionForConfirmation(draft: CollectionDraft): CollectionValidationResult {
  const fieldErrors: CollectionFieldErrors = {
    ...fieldErrorForPlatform(draft.images, "MEITUAN"),
    ...fieldErrorForPlatform(draft.images, "B_JIA"),
  };

  return { ok: Object.keys(fieldErrors).length === 0, fieldErrors };
}
