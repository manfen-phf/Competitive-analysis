import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { filterOrdersForUser } from "@/lib/analytics";
import { getPrisma } from "@/lib/db";
import { DEMO_RECORDS } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const requestedCity = request.nextUrl.searchParams.get("city")?.trim() || undefined;
  const demoRequested = request.nextUrl.searchParams.get("demo") === "1";
  if (user.role === "BD" && requestedCity && requestedCity !== user.city) return NextResponse.json({ error: "无权查看该城市筛选项" }, { status: 403 });
  const city = user.role === "BD" ? user.city ?? undefined : requestedCity;
  let assignments: { city: string; bdName: string }[] = [];

  try {
    const prisma = await getPrisma();
    assignments = await prisma.merchantAssignment.findMany({
      where: { version: { isActive: true }, ...(city ? { city } : {}), ...(user.role === "BD" ? { bdName: user.bdName ?? "" } : {}) },
      select: { city: true, bdName: true },
      distinct: city ? ["bdName"] : ["city"],
      orderBy: city ? { bdName: "asc" } : { city: "asc" },
    });
  } catch {
    // Local demo remains available when D1 is not configured.
  }

  // Never append sample options to real master data. BD users receive only
  // their active-assignment scope and never get a demo fallback.
  const demoRecords = assignments.length === 0 && demoRequested && user.role !== "BD" ? filterOrdersForUser(user, DEMO_RECORDS) : [];
  const values = city
    ? [...assignments.map((item) => item.bdName), ...demoRecords.filter((item) => item.city === city).map((item) => item.bdName)]
    : [...assignments.map((item) => item.city), ...demoRecords.map((item) => item.city)];
  return NextResponse.json({ values: [...new Set(values)].sort((left, right) => left.localeCompare(right, "zh-CN")) });
}
