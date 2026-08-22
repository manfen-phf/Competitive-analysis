import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canReadOrder } from "@/lib/permissions";
import { readScreenshotFromCloudStorage } from "@/lib/cloudbase-storage";
import { isUploadImageTokenValid } from "@/lib/storage";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return new NextResponse("Not found", { status: 404 });
  const { id } = await context.params;
  const prisma = await getPrisma();
  const token = request.nextUrl.searchParams.get("token");
  const upload = await prisma.upload.findUnique({
    where: { id },
    include: { collection: { select: { city: true, bdName: true } } },
  });
  if (!upload || !canReadOrder(user, upload.collection) || !isUploadImageTokenValid(upload.imageAccessToken, token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const image = await readScreenshotFromCloudStorage(upload.imageFileId);
    return new NextResponse(new Uint8Array(image), {
      headers: { "Content-Type": upload.imageMimeType, "Cache-Control": "private, no-store" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
