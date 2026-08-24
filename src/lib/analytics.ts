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
const pad = (value: number) => String(value).padStart(2, "0");
const dateValue = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export type NaturalWeek = { label: string; start: string; end: string };

/** Natural weeks begin with Jan 1–the first Sunday, then run Monday–Sunday. */
export function naturalWeeksForYear(year: number): NaturalWeek[] {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const firstMondayOffset = (8 - yearStart.getDay()) % 7;
  const weeks: NaturalWeek[] = [];
  let weekNumber = 1;
  let start = new Date(year, 0, 1);

  if (firstMondayOffset > 0) {
    const end = new Date(year, 0, firstMondayOffset);
    weeks.push({ label: `${year} W${weekNumber}`, start: dateValue(start), end: dateValue(end) });
    start = new Date(year, 0, firstMondayOffset + 1);
    weekNumber += 1;
  }

  while (start <= yearEnd) {
    const end = new Date(Math.min(new Date(year, 11, 31).valueOf(), new Date(year, start.getMonth(), start.getDate() + 6).valueOf()));
    weeks.push({ label: `${year} W${weekNumber}`, start: dateValue(start), end: dateValue(end) });
    start = new Date(year, start.getMonth(), start.getDate() + 7);
    weekNumber += 1;
  }

  return weeks;
}

/** Natural weeks keep Jan 1 through the first Sunday in W1. */
export function periodLabel(date: Date, period: PeriodKey) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (period === "YEAR") return String(year);
  if (period === "MONTH") return `${year}-${month}`;
  if (period === "DAY") return `${year}-${month}-${day}`;
  const dateString = dateValue(new Date(year, date.getMonth(), date.getDate()));
  return naturalWeeksForYear(year).find((week) => dateString >= week.start && dateString <= week.end)?.label ?? `${year} W1`;
}

export function filterOrdersForUser(user: AnalysisUserScope, records: ComparableRecord[], allowedMerchantIds?: ReadonlySet<string>) {
  if (user.role !== "BD") return records;
  if (!user.city || !user.bdName) return [];
  return records.filter((record) => record.city === user.city && record.bdName === user.bdName && (!allowedMerchantIds || allowedMerchantIds.has(record.merchantId)));
}

export type AnalyticsDataSource = "REAL" | "DEMO" | "EMPTY";
export type AnalyticsDataset = { records: ComparableRecord[]; source: AnalyticsDataSource };

/** A real snapshot always wins. Demo data is a labelled fallback and is never mixed in. */
export function chooseAnalyticsDataset({ user, realRecords, demoRecords, allowedMerchantIds, allowDemo }: {
  user: AnalysisUserScope;
  realRecords: ComparableRecord[];
  demoRecords: ComparableRecord[];
  allowedMerchantIds?: ReadonlySet<string>;
  allowDemo: boolean;
}): AnalyticsDataset {
  const real = filterOrdersForUser(user, realRecords, allowedMerchantIds);
  if (real.length) return { records: real, source: "REAL" };
  if (!allowDemo) return { records: [], source: "EMPTY" };
  const demo = filterOrdersForUser(user, demoRecords, allowedMerchantIds);
  return demo.length ? { records: demo, source: "DEMO" } : { records: [], source: "EMPTY" };
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
  comparison: Array<{ key: MetricKey; label: string; meituan: number | null; bJia: number | null; difference: number | null; unit: "money" | "percent" }>;
  trend: Array<{ label: string; meituan: number | null; bJia: number | null; meituanObservationCount: number; bJiaObservationCount: number }>;
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
  const comparison = filtered.length ? metricKeys.map((key) => {
    const meituan = platformAverages.MEITUAN.validOrderCount ? platformAverages.MEITUAN[key] : null;
    const bJia = platformAverages.B_JIA.validOrderCount ? platformAverages.B_JIA[key] : null;
    return { key, label: metricLabels[key], meituan, bJia, difference: meituan === null || bJia === null ? null : meituan - bJia, unit: metricUnits[key] };
  }) : [];
  const buckets = new Map<string, ComparableRecord[]>();
  for (const record of filtered) { const key = periodLabel(new Date(record.uploadedAt), period); buckets.set(key, [...(buckets.get(key) ?? []), record]); }
  const trend = [...buckets.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([label, rows]) => {
    const meituanRows = rows.filter((record) => record.platform === "MEITUAN");
    const bJiaRows = rows.filter((record) => record.platform === "B_JIA");
    return { label, meituan: meituanRows.length ? average(meituanRows, metric) : null, bJia: bJiaRows.length ? average(bJiaRows, metric) : null, meituanObservationCount: meituanRows.length, bJiaObservationCount: bJiaRows.length };
  });
  const merchantGroups = new Map<string, ComparableRecord[]>();
  for (const record of filtered) merchantGroups.set(record.merchantId, [...(merchantGroups.get(record.merchantId) ?? []), record]);
  const merchantRanking = [...merchantGroups.entries()].flatMap(([merchantId, rows]) => {
    const meituanRows = rows.filter((record) => record.platform === "MEITUAN");
    const bJiaRows = rows.filter((record) => record.platform === "B_JIA");
    if (!meituanRows.length || !bJiaRows.length) return [];
    const meituan = average(meituanRows, metric);
    const bJia = average(bJiaRows, metric);
    return { merchantId, merchantName: rows[0].merchantName, city: rows[0].city, bdName: rows[0].bdName, meituan, bJia, difference: meituan - bJia, unit: metricUnits[metric] };
  }).sort((left, right) => Math.abs(right.difference) - Math.abs(left.difference));
  return { totalOrders: filtered.length, platforms: platformAverages, comparison, trend, merchantRanking, filteredCities: [...new Set(filtered.map((record) => record.city))], filteredBds: [...new Set(filtered.map((record) => record.bdName))], filteredMerchants: [...new Set(filtered.map((record) => record.merchantName))] };
}
