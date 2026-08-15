import { z } from "zod";

export const platformSchema = z.enum(["MEITUAN", "B_JIA"]);

const nullableMoney = z.number().finite().nonnegative().nullable().optional().transform((value) => value ?? null);
const nullableSignedMoney = z.number().finite().nullable().optional().transform((value) => value ?? null);
const nullableText = z.string().trim().min(1).nullable().optional().transform((value) => value ?? null);

/** The model only has to reliably identify the platform and the total goods price. */
export const recognitionRawSchema = z.object({
  platform: platformSchema,
  goodsTotal: z.number().finite().nonnegative(),
  orderNumber: nullableText,
  packagingFee: nullableMoney,
  merchantActivityAmount: nullableMoney,
  otherActivityAmount: nullableMoney,
  deliveryFeeReduction: nullableMoney,
  platformRedPacketAmount: nullableMoney,
  platformRedPacketMerchantShare: nullableMoney,
  merchantSettlementAmount: nullableSignedMoney,
  technicalServiceFee: nullableMoney,
  deliveryServiceFee: nullableMoney,
  confidence: z.number().finite().min(0).max(1).nullable().optional().transform((value) => value ?? null),
});

export type RecognitionRawResult = z.infer<typeof recognitionRawSchema>;

export type FlexibleRecognitionResult = RecognitionRawResult & {
  dishPrice: number;
  originalDeliveryFee: number;
  paidDeliveryFee: number | null;
  userPaidAmount: number | null;
  merchantRate: number | null;
};

// Backwards-compatible name for the active V1 recognition path.
export type RecognitionResult = FlexibleRecognitionResult;
export const recognitionSchema = recognitionRawSchema;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateOrderMetrics(result: RecognitionRawResult, originalDeliveryFee: number) {
  const dishPrice = roundMoney(result.goodsTotal - (result.packagingFee ?? 0));
  const paidDeliveryFee = result.deliveryFeeReduction === null
    ? null
    : roundMoney(originalDeliveryFee - result.deliveryFeeReduction);
  const userPaidAmount = result.merchantActivityAmount === null
    ? null
    : roundMoney(result.goodsTotal + originalDeliveryFee - result.merchantActivityAmount);
  const merchantRate = result.technicalServiceFee === null || result.deliveryServiceFee === null || result.goodsTotal === 0
    ? null
    : roundMoney(((result.technicalServiceFee + result.deliveryServiceFee) / result.goodsTotal) * 100);
  return { dishPrice, paidDeliveryFee, userPaidAmount, merchantRate };
}

export function normalizeRecognitionResult(payload: unknown, originalDeliveryFee: number): FlexibleRecognitionResult {
  if (!Number.isFinite(originalDeliveryFee) || originalDeliveryFee < 0) throw new Error("原价配送费无效");
  const parsed = recognitionRawSchema.parse(payload);
  return { ...parsed, originalDeliveryFee: roundMoney(originalDeliveryFee), ...calculateOrderMetrics(parsed, originalDeliveryFee) };
}

export function validateRecognition(payload: unknown): { ok: boolean; reason?: string } {
  const parsed = recognitionRawSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, reason: "缺少商品总价或金额格式错误" };
  return { ok: true };
}
