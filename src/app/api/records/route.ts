import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { toRecordListItem } from "@/lib/record-list";

export async function GET(request: NextRequest) {
  const prisma = await getPrisma();
  const requested = Number(request.nextUrl.searchParams.get("limit") || "50");
  const take = Number.isFinite(requested) ? Math.min(Math.max(Math.floor(requested), 1), 100) : 50;
  const uploads = await prisma.upload.findMany({
    take,
    orderBy: { uploadedAt: "desc" },
    include: { order: true, failure: true },
  });
  return NextResponse.json({ records: uploads.map(toRecordListItem) });
}