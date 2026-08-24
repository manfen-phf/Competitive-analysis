import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { canManageDataCenter } from "@/lib/permissions";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (!canManageDataCenter(user)) return NextResponse.json({ error: "无权访问数据中心" }, { status: 403 });
  const prisma = await getPrisma();
  const [validCount, failedCount, pendingCount, merchants, covered, recognized] = await Promise.all([
    prisma.orderRecord.count(), prisma.recognitionFailure.count(), prisma.upload.count({ where: { recognitionStatus: { in: ["PENDING", "PROCESSING"] } } }),
    prisma.merchantAssignment.findMany({ where: { version: { isActive: true } }, select: { merchantId: true }, distinct: ["merchantId"] }),
    prisma.orderRecord.findMany({ select: { merchantId: true }, distinct: ["merchantId"] }),
    prisma.upload.findMany({ where: { recognitionStatus: "SUCCEEDED", recognitionResult: { not: null } }, select: { recognitionResult: true } }),
  ]);
  const confidences = recognized.flatMap((upload) => {
    try {
      const confidence = JSON.parse(upload.recognitionResult ?? "{}")?.confidence;
      return typeof confidence === "number" && Number.isFinite(confidence) ? [confidence] : [];
    } catch { return []; }
  });
  return NextResponse.json({
    validCount, failedCount, pendingCount, duplicateCount: 0,
    merchantCoverageRate: merchants.length ? covered.length / merchants.length : 0,
    averageConfidence: confidences.length ? confidences.reduce((total, value) => total + value, 0) / confidences.length : 0,
  });
}
