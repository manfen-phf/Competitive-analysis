import { getReportPeriod } from "@/lib/time";

export type PriceRecord = { platform: "MEITUAN" | "B_JIA"; userPaidAmount: number; platformRedPacket: number; paidDeliveryFee: number; merchantSettlementAmount: number };
export type MerchantPriceRecord = PriceRecord & { merchantId: string; merchantName: string };
export type TrendRecord = PriceRecord & { uploadedAt: Date };
export type TrendPeriod = "DAY" | "WEEK" | "MONTH" | "YEAR";

export function averageByPlatform(records: PriceRecord[]) {
  return (["MEITUAN", "B_JIA"] as const).reduce((result, platform) => {
    const rows = records.filter((row) => row.platform === platform);
    const average = (key: keyof PriceRecord) => rows.length ? rows.reduce((sum, row) => sum + Number(row[key]), 0) / rows.length : 0;
    result[platform] = { validOrderCount: rows.length, userPaidAmount: average("userPaidAmount"), platformRedPacket: average("platformRedPacket"), paidDeliveryFee: average("paidDeliveryFee"), merchantSettlementAmount: average("merchantSettlementAmount") };
    return result;
  }, {} as Record<"MEITUAN" | "B_JIA", { validOrderCount:number; userPaidAmount:number; platformRedPacket:number; paidDeliveryFee:number; merchantSettlementAmount:number }>);
}

function chinaParts(date: Date) {
  const values = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return Object.fromEntries(values.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function trendLabel(date: Date, period: TrendPeriod) {
  const parts = chinaParts(date);
  if (period === "YEAR") return parts.year;
  if (period === "MONTH") return `${parts.year}-${parts.month}`;
  if (period === "WEEK") return getReportPeriod(date).weekKey;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function trendByPeriod(records: TrendRecord[], period: TrendPeriod) {
  const groups = new Map<string, TrendRecord[]>();
  for (const record of records) {
    const label = trendLabel(record.uploadedAt, period);
    groups.set(label, [...(groups.get(label) ?? []), record]);
  }
  return [...groups.entries()].map(([label, rows]) => {
    const platforms = averageByPlatform(rows);
    return { label, platforms, userPaidDifference: platforms.MEITUAN.userPaidAmount - platforms.B_JIA.userPaidAmount };
  }).sort((left, right) => left.label.localeCompare(right.label));
}

export function merchantPriceRanking(records: MerchantPriceRecord[]) {
  const groups = new Map<string, MerchantPriceRecord[]>();
  for (const row of records) groups.set(row.merchantId, [...(groups.get(row.merchantId) ?? []), row]);
  return [...groups.entries()].flatMap(([merchantId, rows]) => {
    const averages = averageByPlatform(rows);
    if (!averages.MEITUAN.validOrderCount || !averages.B_JIA.validOrderCount) return [];
    return [{ merchantId, merchantName: rows[0].merchantName || merchantId, meituanUserPaid: averages.MEITUAN.userPaidAmount, bJiaUserPaid: averages.B_JIA.userPaidAmount, userPaidDifference: averages.MEITUAN.userPaidAmount - averages.B_JIA.userPaidAmount }];
  }).sort((left, right) => right.userPaidDifference - left.userPaidDifference);
}
export const recognizedMetricKeys = ["dishPrice", "packagingFee", "platformRedPacket", "originalDeliveryFee", "deliveryFeeReduction", "paidDeliveryFee", "merchantSettlementAmount", "userPaidAmount", "otherPromotion", "technicalServiceFee", "deliveryServiceFee", "merchantRate"] as const;
export type RecognizedMetricKey = typeof recognizedMetricKeys[number];
export type MetricRecord = { platform: "MEITUAN" | "B_JIA" } & Partial<Record<RecognizedMetricKey, number>>;

export function metricAverages(records: MetricRecord[]) {
  return (['MEITUAN', 'B_JIA'] as const).reduce((result, platform) => {
    const rows = records.filter((row) => row.platform === platform);
    result[platform] = Object.fromEntries(recognizedMetricKeys.map((key) => [key, rows.length ? rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0) / rows.length : 0])) as Record<RecognizedMetricKey, number>;
    return result;
  }, {} as Record<"MEITUAN" | "B_JIA", Record<RecognizedMetricKey, number>>);
}
export function priceBandSummary(records: MetricRecord[]) {
  const bands = [{ label: "0-20元", min: 0, max: 20 }, { label: "20-30元", min: 20, max: 30 }, { label: "30-50元", min: 30, max: 50 }, { label: "50-80元", min: 50, max: 80 }, { label: "80元以上", min: 80, max: Infinity }];
  return bands.map((band) => {
    const rows = records.filter((row) => Number(row.dishPrice ?? 0) >= band.min && Number(row.dishPrice ?? 0) < band.max);
    const platforms = (['MEITUAN', 'B_JIA'] as const).reduce((result, platform) => {
      const items = rows.filter((row) => row.platform === platform);
      result[platform] = { validOrderCount: items.length, userPaidAmount: items.length ? items.reduce((sum, row) => sum + Number(row.userPaidAmount ?? 0), 0) / items.length : 0 };
      return result;
    }, {} as Record<'MEITUAN' | 'B_JIA', { validOrderCount:number; userPaidAmount:number }>);
    return { label: band.label, platforms };
  });
}
export function dimensionSummary(records: (MetricRecord & { city?: string; bdName?: string })[], dimension: "city" | "bdName") {
 const groups = new Map<string, typeof records>(); for (const row of records) { const label = row[dimension] || "未归属"; groups.set(label, [...(groups.get(label) ?? []), row]); }
 return [...groups.entries()].map(([label, rows]) => ({ label, platforms: (['MEITUAN','B_JIA'] as const).reduce((out, platform) => { const items=rows.filter(r=>r.platform===platform); out[platform]={validOrderCount:items.length,userPaidAmount:items.length?items.reduce((s,r)=>s+Number(r.userPaidAmount??0),0)/items.length:0,platformRedPacket:items.length?items.reduce((s,r)=>s+Number(r.platformRedPacket??0),0)/items.length:0,paidDeliveryFee:items.length?items.reduce((s,r)=>s+Number(r.paidDeliveryFee??0),0)/items.length:0}; return out; }, {} as Record<'MEITUAN'|'B_JIA',{validOrderCount:number;userPaidAmount:number;platformRedPacket:number;paidDeliveryFee:number}>)})).sort((a,b)=>b.platforms.MEITUAN.validOrderCount+b.platforms.B_JIA.validOrderCount-(a.platforms.MEITUAN.validOrderCount+a.platforms.B_JIA.validOrderCount));
}