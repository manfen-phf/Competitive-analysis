import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { filterOrdersForUser } from "@/lib/analytics";
import { getPrisma } from "@/lib/db";
import { DEMO_RECORDS } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const requestedCity = request.nextUrl.searchParams.get("city")?.trim();
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  const demoRequested = request.nextUrl.searchParams.get("demo") === "1";
  if (!requestedCity) return NextResponse.json({ error: "请选择城市" }, { status: 400 });
  if (user.role === "BD" && requestedCity !== user.city) return NextResponse.json({ error: "无权查看该城市商家" }, { status: 403 });

  let merchants: { merchantId: string; merchantName: string; bdName: string }[] = [];
  try {
    const prisma = await getPrisma();
    merchants = await prisma.merchantAssignment.findMany({
      where: {
        city: requestedCity,
        ...(user.role === "BD" ? { bdName: user.bdName ?? "" } : {}),
        version: { isActive: true },
        OR: [{ merchantId: { contains: query } }, { merchantName: { contains: query } }],
      },
      select: { merchantId: true, merchantName: true, bdName: true },
      distinct: ["merchantId"],
      take: 30,
    });
  } catch {
    // Local demo remains available when D1 is not configured.
  }

  // Never mix real merchants with sample merchants, and never surface sample
  // merchants to a BD because they are not active assignment records.
  const demoMerchants = merchants.length === 0 && demoRequested && user.role !== "BD"
    ? filterOrdersForUser(user, DEMO_RECORDS)
      .filter((record) => record.city === requestedCity && (!query || record.merchantId.includes(query) || record.merchantName.includes(query)))
      .filter((record, index, records) => records.findIndex((item) => item.merchantId === record.merchantId) === index)
      .slice(0, 30)
      .map((record) => ({ merchantId: record.merchantId, merchantName: record.merchantName, bdName: record.bdName }))
    : [];
  const values = [...merchants, ...demoMerchants].filter((item, index, rows) => rows.findIndex((row) => row.merchantId === item.merchantId) === index).slice(0, 30);
  return NextResponse.json({ merchants: values });
}
