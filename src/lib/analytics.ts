export type Platform = "MEITUAN" | "B_JIA";

export type MetricKey =
  | "userPaidAmount"
  | "dishPrice"
  | "platformRedPacket"
  | "otherPromotion"
  | "paidDeliveryFee"
  | "merchantSettlementAmount"
  | "technicalServiceFee"
  | "deliveryServiceFee"
  | "merchantRate";

export type PeriodKey = "DAY" | "WEEK" | "MONTH" | "YEAR";

export type PriceRecord = {
  platform: Platform;
  userPaidAmount: number;
  platformRedPacket: number;
  paidDeliveryFee: number;
  merchantSettlementAmount: number;
};

export type ComparableRecord = PriceRecord & {
  merchantId: string;
  merchantName: string;
  city: string;
  bdName: string;
  uploadedAt: Date | string;
  dishPrice: number;
  packagingFee: number;
  otherPromotion: number;
  technicalServiceFee: number;
  deliveryServiceFee: number;
  merchantRate: number;
};

export type MerchantPriceRecord = PriceRecord & { merchantId: string; merchantName: string };

export type AnalysisUserScope = {
  role: "SUPER_ADMIN" | "CITY_ADMIN" | "BD";
  city: string | null;
  bdName: string | null;
};

export const metricLabels: Record<MetricKey, string> = {
  userPaidAmount: "用户实付", dishPrice: "菜品原价", platformRedPacket: "平台红包", otherPromotion: "其他活动",
  paidDeliveryFee: "实付配送费", merchantSettlementAmount: "商家结算", technicalServiceFee: "技术服务费",
  deliveryServiceFee: "配送服务费", merchantRate: "实际费率",
};

export const metricUnits: Record<MetricKey, "money" | "percent"> = {
  userPaidAmount: "money", dishPrice: "money", platformRedPacket: "money", otherPromotion: "money",
  paidDeliveryFee: "money", merchantSettlementAmount: "money", technicalServiceFee: "money",
  deliveryServiceFee: "money", merchantRate: "percent",
};

const metricKeys = Object.keys(metricLabels) as MetricKey[];
const platforms: Platform[] = ["MEITUAN", "B_JIA"];

function asNumber(value: unknown) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function average(rows: ComparableRecord[], key: MetricKey) { return rows.length === 0 ? 0 : rows.reduce((sum, row) => sum + asNumber(row[key]), 0) / rows.length; }

/** Natural weeks keep Jan 1 through the first Sunday in W1. */
export function periodLabel(date: Date, period: PeriodKey) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (period === "YEAR") return String(year);
  if (period === "MONTH") return `${year}-${month}`;
  if (period === "DAY") return `${year}-${month}-${day}`;
  const yearStart = new Date(year, 0, 1);
  const localDate = new Date(year, date.getMonth(), date.getDate());
  const dayIndex = Math.round((localDate.getTime() - yearStart.getTime()) / 86_400_000);
  const daysBeforeFirstMonday = (8 - yearStart.getDay()) % 7;
  const week = dayIndex < daysBeforeFirstMonday ? 1 : Math.floor((dayIndex - daysBeforeFirstMonday) / 7) + 2;
  return `${year} W${week}`;
}

export function filterOrdersForUser(user: AnalysisUserScope, records: ComparableRecord[]) {
  if (user.role !== "BD") return records;
  if (!user.city || !user.bdName) return [];
  return records.filter((record) => record.city === user.city && record.bdName === user.bdName);
}

export function averageByPlatform(records: PriceRecord[]) {
  return platforms.reduce((result, platform) => {
    const rows = records.filter((row) => row.platform === platform);
    const avg = (key: keyof PriceRecord) => rows.length === 0 ? 0 : rows.reduce((sum, row) => sum + asNumber(row[key]), 0) / rows.length;
    result[platform] = { validOrderCount: rows.length, userPaidAmount: avg("userPaidAmount"), platformRedPacket: avg("platformRedPacket"), paidDeliveryFee: avg("paidDeliveryFee"), merchantSettlementAmount: avg("merchantSettlementAmount") };
    return result;
  }, {} as Record<Platform, { validOrderCount: number; userPaidAmount: number; platformRedPacket: number; paidDeliveryFee: number; merchantSettlementAmount: number }>);
}

export function merchantPriceRanking(records: MerchantPriceRecord[]) {
  const groups = new Map<string, MerchantPriceRecord[]>();
  for (const record of records) groups.set(record.merchantId, [...(groups.get(record.merchantId) ?? []), record]);
  return [...groups.entries()].flatMap(([merchantId, rows]) => {
    const averages = averageByPlatform(rows);
    if (!averages.MEITUAN.validOrderCount || !averages.B_JIA.validOrderCount) return [];
    return [{ merchantId, merchantName: rows[0].merchantName || merchantId, meituanUserPaid: averages.MEITUAN.userPaidAmount, bJiaUserPaid: averages.B_JIA.userPaidAmount, userPaidDifference: averages.MEITUAN.userPaidAmount - averages.B_JIA.userPaidAmount }];
  }).sort((left, right) => right.userPaidDifference - left.userPaidDifference);
}

export type AnalyticsSnapshot = {
  totalOrders: number;
  platforms: Record<Platform, { validOrderCount: number } & Record<MetricKey, number>>;
  comparison: Array<{ key: MetricKey; label: string; meituan: number; bJia: number; difference: number; unit: "money" | "percent" }>;
  trend: Array<{ label: string; meituan: number; bJia: number }>;
  merchantRanking: Array<{ merchantId: string; merchantName: string; city: string; bdName: string; meituan: number; bJia: number; difference: number; unit: "money" | "percent" }>;
  filteredCities: string[];
  filteredBds: string[];
  filteredMerchants: string[];
};

export type AnalyticsOptions = { period?: PeriodKey; city?: string; bdName?: string; merchantId?: string; metric?: MetricKey; start?: string; end?: string };

function isWithinDateRange(record: ComparableRecord, options: AnalyticsOptions) {
  const timestamp = new Date(record.uploadedAt).getTime();
  const start = options.start ? new Date(`${options.start}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const end = options.end ? new Date(`${options.end}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
  return timestamp >= start && timestamp <= end;
}

export function buildAnalyticsSnapshot(records: ComparableRecord[], options: AnalyticsOptions = {}): AnalyticsSnapshot {
  const period = options.period ?? "DAY";
  const metric = options.metric ?? "userPaidAmount";
  const filtered = records.filter((record) => (!options.city || record.city === options.city) && (!options.bdName || record.bdName === options.bdName) && (!options.merchantId || record.merchantId === options.merchantId) && isWithinDateRange(record, options));
  const platformAverages = platforms.reduce((result, platform) => {
    const rows = filtered.filter((record) => record.platform === platform);
    result[platform] = { validOrderCount: rows.length, ...Object.fromEntries(metricKeys.map((key) => [key, average(rows, key)])) } as typeof result[Platform];
    return result;
  }, {} as Record<Platform, { validOrderCount: number } & Record<MetricKey, number>>);
  const comparison = metricKeys.map((key) => ({ key, label: metricLabels[key], meituan: platformAverages.MEITUAN[key], bJia: platformAverages.B_JIA[key], difference: platformAverages.MEITUAN[key] - platformAverages.B_JIA[key], unit: metricUnits[key] }));
  const buckets = new Map<string, ComparableRecord[]>();
  for (const record of filtered) { const key = periodLabel(new Date(record.uploadedAt), period); buckets.set(key, [...(buckets.get(key) ?? []), record]); }
  const trend = [...buckets.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([label, rows]) => ({ label, meituan: average(rows.filter((record) => record.platform === "MEITUAN"), metric), bJia: average(rows.filter((record) => record.platform === "B_JIA"), metric) }));
  const merchantGroups = new Map<string, ComparableRecord[]>();
  for (const record of filtered) merchantGroups.set(record.merchantId, [...(merchantGroups.get(record.merchantId) ?? []), record]);
  const merchantRanking = [...merchantGroups.entries()].map(([merchantId, rows]) => {
    const meituan = average(rows.filter((record) => record.platform === "MEITUAN"), metric);
    const bJia = average(rows.filter((record) => record.platform === "B_JIA"), metric);
    return { merchantId, merchantName: rows[0].merchantName, city: rows[0].city, bdName: rows[0].bdName, meituan, bJia, difference: meituan - bJia, unit: metricUnits[metric] };
  }).filter((record) => record.meituan || record.bJia).sort((left, right) => Math.abs(right.difference) - Math.abs(left.difference));
  return { totalOrders: filtered.length, platforms: platformAverages, comparison, trend, merchantRanking, filteredCities: [...new Set(filtered.map((record) => record.city))], filteredBds: [...new Set(filtered.map((record) => record.bdName))], filteredMerchants: [...new Set(filtered.map((record) => record.merchantName))] };
}
