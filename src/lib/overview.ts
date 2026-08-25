import { buildAnalyticsSnapshot, type ComparableRecord } from "@/lib/analytics";

type OverviewUpload = { platform: string | null; recognitionStatus: string };

export type OverviewCollection = {
  id: string;
  merchantId: string;
  merchantName: string;
  city: string;
  bdName: string;
  status: string;
  createdAt: Date | string;
  uploads: OverviewUpload[];
};

export type OverviewSnapshot = {
  todayMerchantCount: number;
  capturedOrderCount: number;
  pendingConfirmationCount: number;
  failedRecognitionCount: number;
  latestCollections: Array<OverviewCollection & { recognitionSummary: string }>;
  attentionMerchants: Array<{ merchantId: string; merchantName: string; city: string; bdName: string; userPaidGap: number }>;
};

function shanghaiDay(value: Date | string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function recognitionSummary(uploads: OverviewUpload[]) {
  const succeeded = uploads.filter((upload) => upload.recognitionStatus === "SUCCEEDED").length;
  const failed = uploads.filter((upload) => upload.recognitionStatus === "FAILED").length;
  if (failed) return "有识别失败";
  if (succeeded >= 2) return "已识别，待确认";
  if (succeeded) return "等待另一平台截图";
  return "等待识别";
}

/** A small, factual home-page snapshot. It deliberately has no demo data or inferred health score. */
export function buildOverviewSnapshot({ collections, orders, now = new Date() }: {
  collections: OverviewCollection[];
  orders: ComparableRecord[];
  now?: Date;
}): OverviewSnapshot {
  const today = shanghaiDay(now);
  const todayCollections = collections.filter((collection) => shanghaiDay(collection.createdAt) === today);
  const latestCollections = [...collections]
    .sort((left, right) => new Date(right.createdAt).valueOf() - new Date(left.createdAt).valueOf())
    .slice(0, 6)
    .map((collection) => ({ ...collection, recognitionSummary: recognitionSummary(collection.uploads) }));
  const attentionMerchants = buildAnalyticsSnapshot(orders, { metric: "userPaidAmount" }).merchantRanking
    .slice(0, 6)
    .map((merchant) => ({
      merchantId: merchant.merchantId,
      merchantName: merchant.merchantName,
      city: merchant.city,
      bdName: merchant.bdName,
      userPaidGap: merchant.difference,
    }));

  return {
    todayMerchantCount: new Set(todayCollections.map((collection) => collection.merchantId)).size,
    capturedOrderCount: todayCollections.reduce((count, collection) => count + collection.uploads.length, 0),
    pendingConfirmationCount: collections.filter((collection) => collection.status === "READY_TO_CONFIRM").length,
    failedRecognitionCount: collections.reduce((count, collection) => count + collection.uploads.filter((upload) => upload.recognitionStatus === "FAILED").length, 0),
    latestCollections,
    attentionMerchants,
  };
}
