import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const prisma = await getPrisma();
  const city = request.nextUrl.searchParams.get("city")?.trim();
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  if (!city) return NextResponse.json({ error: "请选择城市" }, { status: 400 });
  const merchants = await prisma.merchantAssignment.findMany({
    where: { city, version: { isActive: true }, OR: [{ merchantId: { contains: query } }, { merchantName: { contains: query } }] },
    select: { merchantId: true, merchantName: true, bdName: true }, distinct: ["merchantId"], take: 30,
  });
  return NextResponse.json({ merchants });
}
