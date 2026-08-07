import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { imageHash } from "@/lib/dedup";
import { recognizeOrderScreenshot } from "@/lib/ocr";
import { assertSupportedScreenshot, imageDataUrl } from "@/lib/storage";
import { validateRecognition } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const prisma = await getPrisma();
  const form = await request.formData();
  const city = String(form.get("city") ?? "").trim();
  const merchantId = String(form.get("merchantId") ?? "").trim();
  const file = form.get("file");

  if (!city || !merchantId || !(file instanceof File)) {
    return NextResponse.json({ error: "请选择城市、商家并上传截图" }, { status: 400 });
  }

  const uploadedAt = new Date();
  const assignment = await prisma.merchantAssignment.findFirst({
    where: {
      city,
      merchantId,
      version: { isActive: true },
      effectiveFrom: { lte: uploadedAt },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: uploadedAt } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!assignment) {
    return NextResponse.json({ error: "所选商家不在当前城市，或上传日期未匹配到有效 BD 归属" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    assertSupportedScreenshot(bytes, file.type);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "截图不符合要求" }, { status: 400 });
  }

  const hash = imageHash(bytes);
  if (await prisma.upload.findUnique({ where: { imageHash: hash } })) {
    return NextResponse.json({ error: "重复截图，未计入数据" }, { status: 409 });
  }

  const upload = await prisma.upload.create({ data: { imageHash: hash } });
  try {
    const recognition = await recognizeOrderScreenshot(imageDataUrl(bytes, file.type));
    await prisma.upload.update({ where: { id: upload.id }, data: { recognitionJson: recognition } });

    const validation = validateRecognition(recognition);
    if (!validation.ok) throw new Error(validation.reason);

    const { confidence: _confidence, ...orderFields } = recognition;
    if (await prisma.orderRecord.findUnique({ where: { orderNumber: orderFields.orderNumber } })) {
      throw new Error("重复订单，未计入数据");
    }

    await prisma.orderRecord.create({
      data: {
        uploadId: upload.id,
        uploadedAt,
        merchantId,
        merchantName: assignment.merchantName,
        city,
        bdName: assignment.bdName,
        ...orderFields,
      },
    });
    return NextResponse.json({ status: "SUCCESS", uploadId: upload.id });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "图片识别失败";
    await prisma.recognitionFailure.create({ data: { uploadId: upload.id, reason } });
    return NextResponse.json({ status: "FAILED", reason }, { status: 422 });
  }
}