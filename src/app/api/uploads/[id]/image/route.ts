import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const prisma = await getPrisma();
  const token = request.nextUrl.searchParams.get("token");
  const upload = await prisma.upload.findUnique({ where: { id }, select: { imageData: true, imageMimeType: true, imageAccessToken: true } });
  if (!upload || !token || token !== upload.imageAccessToken) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(upload.imageData), { headers: { "Content-Type": upload.imageMimeType, "Cache-Control": "private, no-store" } });
}
