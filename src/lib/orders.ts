import * as XLSX from "xlsx";

import { calculateOrderDerivedValues } from "@/lib/order-calculations";
import { canExportOrders, canManageDataCenter } from "@/lib/permissions";

export const exportColumns = [
  "采集时间", "城市", "BD", "商家ID", "商家名称", "平台", "商品总价", "菜品原价", "打包费", "商家活动款", "其他活动", "原价配送费", "减配送费", "实付配送费", "平台红包抵扣金额", "平台红包商家承担", "结算金额", "用户实付", "技术服务费", "配送服务费", "实际费率", "识别状态",
] as const;

export type DataCenterUser = {
  role: "SUPER_ADMIN" | "CITY_ADMIN" | "BD";
  city: string | null;
  bdName: string | null;
};

export type OrderExportRow = {
  id: string;
  uploadedAt: Date | string;
  city: string;
  bdName: string;
  merchantId: string;
  merchantName: string;
  platform: string;
  goodsTotal: number;
  dishPrice: number;
  packagingFee: number;
  merchantActivity: number;
  otherPromotion: number;
  originalDeliveryFee: number;
  deliveryFeeReduction: number;
  paidDeliveryFee: number;
  platformRedPacket: number;
  platformRedPacketMerchantShare: number;
  merchantSettlementAmount: number;
  userPaidAmount: number;
  technicalServiceFee: number;
  deliveryServiceFee: number;
  merchantRate: number;
  recognitionStatus: string;
};

export type OrderExportFilters = { city?: string };

const platformLabel = (platform: string) => platform === "MEITUAN" ? "美团" : "B家";
const recognitionLabel = (status: string) => {
  if (status === "CONFIRMED") return "已确认";
  if (status === "FAILED") return "识别失败";
  if (status === "PENDING") return "待确认";
  return "已识别";
};

function formatShanghaiDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function exportOrders({ user, filters, rows }: {
  user: DataCenterUser;
  filters: OrderExportFilters;
  rows: OrderExportRow[];
}) {
  if (!canManageDataCenter(user)) return { status: 403 as const };
  if (user.role === "CITY_ADMIN" && filters.city && filters.city !== user.city) return { status: 403 as const };
  const city = user.role === "CITY_ADMIN" ? user.city : filters.city;
  if ((user.role === "CITY_ADMIN" && !city) || (city && !canExportOrders(user, city))) return { status: 403 as const };

  const data = rows.filter((row) => !city || row.city === city).map((row) => [
    formatShanghaiDate(row.uploadedAt), row.city, row.bdName, row.merchantId, row.merchantName,
    platformLabel(row.platform), row.goodsTotal, row.dishPrice, row.packagingFee, row.merchantActivity,
    row.otherPromotion, row.originalDeliveryFee, row.deliveryFeeReduction, row.paidDeliveryFee,
    row.platformRedPacket, row.platformRedPacketMerchantShare, row.merchantSettlementAmount,
    row.userPaidAmount, row.technicalServiceFee, row.deliveryServiceFee, row.merchantRate,
    recognitionLabel(row.recognitionStatus),
  ]);
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([[...exportColumns], ...data]);
  sheet["!cols"] = exportColumns.map((header) => ({ wch: Math.max(header.length + 2, 14) }));
  XLSX.utils.book_append_sheet(workbook, sheet, "订单数据");
  return { status: 200 as const, workbook: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) };
}

type MutableOrderFields = {
  goodsTotal: number;
  packagingFee: number;
  merchantActivity: number;
  otherPromotion: number;
  originalDeliveryFee: number;
  deliveryFeeReduction: number;
  platformRedPacket: number;
  platformRedPacketMerchantShare: number;
  merchantSettlementAmount: number;
  technicalServiceFee: number;
  deliveryServiceFee: number;
};

const numberOrError = (value: unknown, label: string) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? { ok: true as const, value: number } : { ok: false as const, error: `${label}必须是有效的非负金额` };
};

/** Only source values are accepted. Scope, platform and calculated values can never be altered from a browser request. */
export function sanitizeOrderPatch(input: unknown): { ok: true; data: MutableOrderFields & ReturnType<typeof calculateOrderDerivedValues> } | { ok: false; error: string } {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const required: Array<[keyof MutableOrderFields, string]> = [["goodsTotal", "商品总价"]];
  const optional: Array<[keyof MutableOrderFields, string]> = [
    ["packagingFee", "打包费"], ["merchantActivity", "商家活动款"], ["otherPromotion", "其他活动"],
    ["originalDeliveryFee", "原价配送费"], ["deliveryFeeReduction", "减配送费"],
    ["platformRedPacket", "平台红包抵扣金额"], ["platformRedPacketMerchantShare", "平台红包商家承担"],
    ["technicalServiceFee", "技术服务费"], ["deliveryServiceFee", "配送服务费"],
  ];
  const data = {} as MutableOrderFields;
  for (const [key, label] of required) {
    const parsed = numberOrError(source[key], label);
    if (!parsed.ok) return parsed;
    data[key] = parsed.value;
  }
  for (const [key, label] of optional) {
    if (source[key] === undefined || source[key] === null || source[key] === "") {
      data[key] = 0;
      continue;
    }
    const parsed = numberOrError(source[key], label);
    if (!parsed.ok) return parsed;
    data[key] = parsed.value;
  }
  if (source.merchantSettlementAmount === undefined || source.merchantSettlementAmount === null || source.merchantSettlementAmount === "") {
    data.merchantSettlementAmount = 0;
  } else {
    const settlement = typeof source.merchantSettlementAmount === "number"
      ? source.merchantSettlementAmount
      : Number(source.merchantSettlementAmount);
    if (!Number.isFinite(settlement)) return { ok: false, error: "结算金额必须是有效金额" };
    data.merchantSettlementAmount = settlement;
  }
  if (data.packagingFee > data.goodsTotal) return { ok: false, error: "打包费不能大于商品总价" };
  return { ok: true, data: { ...data, ...calculateOrderDerivedValues(data) } };
}
