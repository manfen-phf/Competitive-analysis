import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const city = request.nextUrl.searchParams.get("city")?.trim();
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  if (!city) return NextResponse.json({ error: "请选择城市" }, { status: 400 });
  if (user.role !== "SUPER_ADMIN" && user.city !== city) return NextResponse.json({ error: "无权查看该城市商家" }, { status: 403 });
  const prisma = await getPrisma();
  const merchants = await prisma.merchantAssignment.findMany({
    where: { city, ...(user.role === "BD" ? { bdName: user.bdName ?? "" } : {}), version: { isActive: true }, OR: [{ merchantId: { contains: query } }, { merchantName: { contains: query } }] },
    select: { merchantId: true, merchantName: true, bdName: true }, distinct: ["merchantId"], take: 30,
  });
  return NextResponse.json({ merchants });
}
