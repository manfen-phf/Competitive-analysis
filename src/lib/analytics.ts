export type PriceRecord = { platform: "MEITUAN" | "B_JIA"; userPaidAmount: number; platformRedPacket: number; paidDeliveryFee: number; merchantSettlementAmount: number };
export type MerchantPriceRecord = PriceRecord & { merchantId: string; merchantName: string };

export function averageByPlatform(records: PriceRecord[]) {
  return (["MEITUAN", "B_JIA"] as const).reduce((result, platform) => {
    const rows = records.filter((row) => row.platform === platform);
    const average = (key: keyof PriceRecord) => rows.length ? rows.reduce((sum, row) => sum + Number(row[key]), 0) / rows.length : 0;
    result[platform] = { validOrderCount: rows.length, userPaidAmount: average("userPaidAmount"), platformRedPacket: average("platformRedPacket"), paidDeliveryFee: average("paidDeliveryFee"), merchantSettlementAmount: average("merchantSettlementAmount") };
    return result;
  }, {} as Record<"MEITUAN" | "B_JIA", { validOrderCount:number; userPaidAmount:number; platformRedPacket:number; paidDeliveryFee:number; merchantSettlementAmount:number }>);
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
