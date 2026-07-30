import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { readUploadImage } from "@/lib/storage";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const prisma = await getPrisma();
  const token = request.nextUrl.searchParams.get("token");
  const upload = await prisma.upload.findUnique({ where: { id }, select: { imagePath: true, imageAccessToken: true } });
  if (!upload || !token || token !== upload.imageAccessToken || !upload.imagePath) return new NextResponse("Not found", { status: 404 });
  try {
    const image = await readUploadImage(upload.imagePath);
    if (!image) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(await image.arrayBuffer(), { headers: { "Content-Type": image.httpMetadata?.contentType ?? "image/jpeg", "Cache-Control": "private, no-store" } });
  } catch { return new NextResponse("Not found", { status: 404 }); }
}
