import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const prisma = await getPrisma();
  const city = request.nextUrl.searchParams.get("city")?.trim();
  const assignments = await prisma.merchantAssignment.findMany({
    where: { version: { isActive: true }, ...(city ? { city } : {}) },
    select: { city: true, bdName: true },
    distinct: city ? ["bdName"] : ["city"],
    orderBy: city ? { bdName: "asc" } : { city: "asc" },
  });
  return NextResponse.json({ values: assignments.map((item) => city ? item.bdName : item.city) });
}
