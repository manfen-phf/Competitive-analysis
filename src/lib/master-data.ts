export type MerchantAssignmentInput = { merchantId: string; merchantName: string; city: string; bdName: string; effectiveFrom: Date; effectiveTo: Date | null };

const aliases = {
  merchantId: ["商家ID"], merchantName: ["商家名称"], city: ["城市", "外卖组织结构"], bdName: ["BD姓名", "合作BD"],
  effectiveFrom: ["生效开始日"], effectiveTo: ["生效结束日"],
} as const;
const valueOf = (row: Record<string, unknown>, keys: readonly string[]) => keys.map((key) => row[key]).find((value) => String(value ?? "").trim()) ?? "";

export function parseMasterDataRows(rows: Record<string, unknown>[], defaultEffectiveFrom?: Date): { valid: boolean; rows: MerchantAssignmentInput[]; errors: string[] } {
  const errors: string[] = [];
  const parsed = rows.flatMap((row, index) => {
    const merchantId = String(valueOf(row, aliases.merchantId)).trim(); const merchantName = String(valueOf(row, aliases.merchantName)).trim();
    const city = String(valueOf(row, aliases.city)).trim(); const bdName = String(valueOf(row, aliases.bdName)).trim();
    if (!merchantId || !merchantName || !city || !bdName) { errors.push(`第${index + 2}行缺少商家ID、商家名称、城市/外卖组织结构或BD姓名/合作BD`); return []; }
    const dateValue = valueOf(row, aliases.effectiveFrom);
    const effectiveFrom = dateValue ? new Date(String(dateValue)) : defaultEffectiveFrom;
    if (!effectiveFrom) { errors.push(`第${index + 2}行缺少生效开始日；请在导入时指定`); return []; }
    if (Number.isNaN(effectiveFrom.valueOf())) { errors.push(`第${index + 2}行生效开始日无效`); return []; }
    const endValue = valueOf(row, aliases.effectiveTo);
    const end = endValue ? new Date(String(endValue)) : null;
    if (end && Number.isNaN(end.valueOf())) { errors.push(`第${index + 2}行生效结束日无效`); return []; }
    if (end) end.setUTCHours(23, 59, 59, 999);
    if (end && end < effectiveFrom) { errors.push(`第${index + 2}行生效结束日不能早于生效开始日`); return []; }
    return [{ merchantId, merchantName, city, bdName, effectiveFrom, effectiveTo: end }];
  });
  const duplicateKeys = new Set<string>();
  for (const item of parsed) {
    const key = `${item.merchantId}|${item.city}|${item.effectiveFrom.toISOString()}`;
    if (duplicateKeys.has(key)) errors.push(`商家 ${item.merchantId} 在 ${item.city} 存在重复的生效开始日`);
    duplicateKeys.add(key);
  }
  return { valid: errors.length === 0, rows: parsed, errors };
}

export function findBdForMerchant(assignments: MerchantAssignmentInput[], merchantId: string, uploadedAt: Date): MerchantAssignmentInput | undefined {
  return assignments.find((a) => a.merchantId === merchantId && a.effectiveFrom <= uploadedAt && (!a.effectiveTo || a.effectiveTo >= uploadedAt));
}

export function searchMerchants(assignments: MerchantAssignmentInput[], city: string, query: string): MerchantAssignmentInput[] {
  const normalized = query.trim().toLowerCase();
  return assignments.filter((item) => item.city === city && (!normalized || item.merchantId.toLowerCase().includes(normalized) || item.merchantName.toLowerCase().includes(normalized)));
}
