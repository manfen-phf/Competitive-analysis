import { z } from "zod";

const money = z.number().finite().nonnegative();
export const recognitionSchema = z.object({
  platform: z.enum(["MEITUAN", "B_JIA"]), orderNumber: z.string().min(1),
  dishPrice: money, packagingFee: money, platformRedPacket: money, originalDeliveryFee: money,
  deliveryFeeReduction: money, paidDeliveryFee: money, merchantSettlementAmount: z.number().finite(),
  userPaidAmount: money, otherPromotion: money, technicalServiceFee: money, deliveryServiceFee: money,
  merchantRate: money, confidence: z.number().min(0).max(1),
});
export type RecognitionResult = z.infer<typeof recognitionSchema>;

export function validateRecognition(payload: unknown): { ok: boolean; reason?: string } {
  const parsed = recognitionSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, reason: "字段缺失或金额格式错误" };
  const data = parsed.data;
  if (data.confidence < 0.8) return { ok: false, reason: "识别置信度不足" };
  if (Math.abs(data.originalDeliveryFee - data.deliveryFeeReduction - data.paidDeliveryFee) > 0.02) return { ok: false, reason: "配送费金额关系不一致" };
  return { ok: true };
}
