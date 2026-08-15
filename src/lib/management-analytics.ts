import type { D1Database } from "@cloudflare/workers-types";

export type ManagementPlatform = "MEITUAN" | "B_JIA";

export type ManagementFilters = {
  start?: string;
  end?: string;
  city?: string;
  bd?: string;
  merchantId?: string;
  platform?: ManagementPlatform;
};

export function parseManagementFilters(url: URL): ManagementFilters {
  const value = (name: string) => url.searchParams.get(name)?.trim() || undefined;
  const platform = value("platform");
  return {
    ...(value("start") ? { start: value("start") } : {}),
    ...(value("end") ? { end: value("end") } : {}),
    ...(value("city") ? { city: value("city") } : {}),
    ...(value("bd") ? { bd: value("bd") } : {}),
    ...(value("merchantId") ? { merchantId: value("merchantId") } : {}),
    ...(platform && isPlatform(platform) ? { platform } : {}),
  };
}

export type UploadStateRow = {
  collectionSessionId: string;
  uploadImageId: string;
  platform: ManagementPlatform;
  recognitionStatus: string | null;
  confirmedOrderId: string | null;
};

export type ConfirmedOrderRow = {
  collectionSessionId: string;
  platform: ManagementPlatform;
  merchantId: string;
  merchantName: string;
  cityName: string;
  bdName: string;
  uploadedAt: string;
  goodsTotal: number | null;
  dishPrice: number | null;
  packagingFee: number | null;
  merchantActivityAmount: number | null;
  otherActivityAmount: number | null;
  originalDeliveryFee: number | null;
  deliveryFeeReduction: number | null;
  paidDeliveryFee: number | null;
  platformRedPacketAmount: number | null;
  platformRedPacketMerchantShare: number | null;
  merchantSettlementAmount: number | null;
  userPaidAmount: number | null;
  technicalServiceFee: number | null;
  deliveryServiceFee: number | null;
  merchantRate: number | null;
};

const platforms: ManagementPlatform[] = ["MEITUAN", "B_JIA"];
const moneyKeys = [
  "goodsTotal", "dishPrice", "packagingFee", "merchantActivityAmount", "otherActivityAmount",
  "originalDeliveryFee", "deliveryFeeReduction", "paidDeliveryFee", "platformRedPacketAmount",
  "platformRedPacketMerchantShare", "merchantSettlementAmount", "userPaidAmount",
  "technicalServiceFee", "deliveryServiceFee", "merchantRate",
] as const;

type MoneyKey = (typeof moneyKeys)[number];
type PlatformSummary = { orderCount: number } & { [Key in `average${Capitalize<MoneyKey>}`]: number };

function decimal(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function platformSummary(rows: ConfirmedOrderRow[], platform: ManagementPlatform): PlatformSummary {
  const items = rows.filter((item) => item.platform === platform);
  const result = { orderCount: items.length } as PlatformSummary;
  for (const key of moneyKeys) {
    const total = items.reduce((sum, item) => sum + Number(item[key] ?? 0), 0);
    const outputKey = `average${key[0].toUpperCase()}${key.slice(1)}` as keyof PlatformSummary;
    result[outputKey] = items.length ? decimal(total / items.length) : 0;
  }
  return result;
}

export function summarizeCollectionStates(rows: UploadStateRow[]) {
  const collections = new Map<string, UploadStateRow[]>();
  for (const row of rows) collections.set(row.collectionSessionId, [...(collections.get(row.collectionSessionId) ?? []), row]);
  const pairedCollectionCount = [...collections.values()].filter((images) => platforms.every((platform) => images.some((image) => image.platform === platform && Boolean(image.confirmedOrderId)))).length;
  return {
    uploadImageCount: rows.length,
    recognizedImageCount: rows.filter((row) => row.recognitionStatus === "SUCCESS").length,
    failedImageCount: rows.filter((row) => row.recognitionStatus === "FAILED").length,
    confirmedImageCount: rows.filter((row) => Boolean(row.confirmedOrderId)).length,
    collectionCount: collections.size,
    pairedCollectionCount,
    incompleteCollectionCount: collections.size - pairedCollectionCount,
  };
}

export function summarizeConfirmedOrders(rows: ConfirmedOrderRow[]) {
  const platformSummaries = {
    MEITUAN: platformSummary(rows, "MEITUAN"),
    B_JIA: platformSummary(rows, "B_JIA"),
  };
  const merchants = new Map<string, ConfirmedOrderRow[]>();
  for (const row of rows) merchants.set(row.merchantId, [...(merchants.get(row.merchantId) ?? []), row]);
  const merchantRanking = [...merchants.entries()].flatMap(([merchantId, items]) => {
    const meituan = platformSummary(items, "MEITUAN");
    const bJia = platformSummary(items, "B_JIA");
    if (!meituan.orderCount || !bJia.orderCount) return [];
    return [{
      merchantId,
      merchantName: items[0]?.merchantName ?? merchantId,
      cityName: items[0]?.cityName ?? "",
      bdName: items[0]?.bdName ?? "",
      meituanUserPaid: meituan.averageUserPaidAmount,
      bJiaUserPaid: bJia.averageUserPaidAmount,
      userPaidDifference: decimal(meituan.averageUserPaidAmount - bJia.averageUserPaidAmount),
    }];
  }).sort((left, right) => right.userPaidDifference - left.userPaidDifference);

  return { confirmedOrderCount: rows.length, platforms: platformSummaries, merchantRanking };
}

type RawConfirmedOrderRow = Omit<ConfirmedOrderRow, "platform"> & { platform: string };
type RawUploadStateRow = Omit<UploadStateRow, "platform"> & { platform: string };

function isPlatform(value: string): value is ManagementPlatform {
  return value === "MEITUAN" || value === "B_JIA";
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toConfirmedOrder(row: RawConfirmedOrderRow): ConfirmedOrderRow {
  if (!isPlatform(row.platform)) throw new Error("Unknown collection platform");
  return {
    ...row,
    platform: row.platform,
    uploadedAt: String(row.uploadedAt),
    goodsTotal: numberOrNull(row.goodsTotal), dishPrice: numberOrNull(row.dishPrice), packagingFee: numberOrNull(row.packagingFee),
    merchantActivityAmount: numberOrNull(row.merchantActivityAmount), otherActivityAmount: numberOrNull(row.otherActivityAmount),
    originalDeliveryFee: numberOrNull(row.originalDeliveryFee), deliveryFeeReduction: numberOrNull(row.deliveryFeeReduction),
    paidDeliveryFee: numberOrNull(row.paidDeliveryFee), platformRedPacketAmount: numberOrNull(row.platformRedPacketAmount),
    platformRedPacketMerchantShare: numberOrNull(row.platformRedPacketMerchantShare), merchantSettlementAmount: numberOrNull(row.merchantSettlementAmount),
    userPaidAmount: numberOrNull(row.userPaidAmount), technicalServiceFee: numberOrNull(row.technicalServiceFee),
    deliveryServiceFee: numberOrNull(row.deliveryServiceFee), merchantRate: numberOrNull(row.merchantRate),
  };
}

function toUploadState(row: RawUploadStateRow): UploadStateRow {
  if (!isPlatform(row.platform)) throw new Error("Unknown collection platform");
  return { ...row, platform: row.platform, recognitionStatus: row.recognitionStatus ?? null, confirmedOrderId: row.confirmedOrderId ?? null };
}

function where(filters: ManagementFilters, platformColumn: string) {
  const clauses: string[] = [];
  const values: string[] = [];
  if (filters.start) { clauses.push('i."uploadedAt" >= ?'); values.push(filters.start); }
  if (filters.end) { clauses.push('i."uploadedAt" < ?'); values.push(filters.end); }
  if (filters.city) { clauses.push('c."name" = ?'); values.push(filters.city); }
  if (filters.bd) { clauses.push('u."displayName" = ?'); values.push(filters.bd); }
  if (filters.merchantId) { clauses.push('m."id" = ?'); values.push(filters.merchantId); }
  if (filters.platform) { clauses.push(`${platformColumn} = ?`); values.push(filters.platform); }
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", values };
}

export async function queryConfirmedOrders(db: D1Database, filters: ManagementFilters = {}) {
  const filtersSql = where(filters, 'o."platform"');
  const result = await db.prepare(`SELECT
      o."collectionSessionId" AS "collectionSessionId", o."platform" AS "platform", m."id" AS "merchantId", m."name" AS "merchantName", c."name" AS "cityName", u."displayName" AS "bdName", i."uploadedAt" AS "uploadedAt",
      o."goodsTotal" AS "goodsTotal", o."dishPrice" AS "dishPrice", o."packagingFee" AS "packagingFee", o."merchantActivityAmount" AS "merchantActivityAmount", o."otherActivityAmount" AS "otherActivityAmount", o."originalDeliveryFee" AS "originalDeliveryFee", o."deliveryFeeReduction" AS "deliveryFeeReduction", o."paidDeliveryFee" AS "paidDeliveryFee", o."platformRedPacketAmount" AS "platformRedPacketAmount", o."platformRedPacketMerchantShare" AS "platformRedPacketMerchantShare", o."merchantSettlementAmount" AS "merchantSettlementAmount", o."userPaidAmount" AS "userPaidAmount", o."technicalServiceFee" AS "technicalServiceFee", o."deliveryServiceFee" AS "deliveryServiceFee", o."merchantRate" AS "merchantRate"
    FROM "ConfirmedOrderV1" o
    JOIN "CollectionSession" s ON s."id" = o."collectionSessionId"
    JOIN "UploadImage" i ON i."id" = o."uploadImageId"
    JOIN "Merchant" m ON m."id" = s."merchantId"
    JOIN "City" c ON c."id" = m."cityId"
    JOIN "UserAccount" u ON u."id" = s."bdUserId"
    ${filtersSql.sql}
    ORDER BY i."uploadedAt" DESC`).bind(...filtersSql.values).all<RawConfirmedOrderRow>();
  return result.results.map(toConfirmedOrder);
}

export async function queryUploadStates(db: D1Database, filters: ManagementFilters = {}) {
  const filtersSql = where(filters, 'i."platform"');
  const result = await db.prepare(`SELECT
      s."id" AS "collectionSessionId", i."id" AS "uploadImageId", i."platform" AS "platform", r."status" AS "recognitionStatus", o."id" AS "confirmedOrderId"
    FROM "CollectionSession" s
    JOIN "UploadImage" i ON i."collectionSessionId" = s."id"
    JOIN "Merchant" m ON m."id" = s."merchantId"
    JOIN "City" c ON c."id" = m."cityId"
    JOIN "UserAccount" u ON u."id" = s."bdUserId"
    LEFT JOIN "RecognitionResult" r ON r."uploadImageId" = i."id"
    LEFT JOIN "ConfirmedOrderV1" o ON o."uploadImageId" = i."id"
    ${filtersSql.sql}
    ORDER BY i."uploadedAt" DESC`).bind(...filtersSql.values).all<RawUploadStateRow>();
  return result.results.map(toUploadState);
}

export async function getManagementOverview(db: D1Database, filters: ManagementFilters = {}) {
  const [orders, uploads] = await Promise.all([queryConfirmedOrders(db, filters), queryUploadStates(db, filters)]);
  return { filters, collection: summarizeCollectionStates(uploads), orders: summarizeConfirmedOrders(orders) };
}
