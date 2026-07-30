import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function GET() {
  const prisma = await getPrisma();
  const [validCount, failedCount, merchants, covered] = await Promise.all([
    prisma.orderRecord.count(), prisma.recognitionFailure.count(),
    prisma.merchantAssignment.findMany({ where: { version: { isActive: true } }, select: { merchantId: true }, distinct: ["merchantId"] }),
    prisma.orderRecord.findMany({ select: { merchantId: true }, distinct: ["merchantId"] }),
  ]);
  return NextResponse.json({ validCount, failedCount, duplicateCount: 0, merchantCoverageRate: merchants.length ? covered.length / merchants.length : 0 });
}
