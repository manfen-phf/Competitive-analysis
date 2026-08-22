import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getPrisma } from "@/lib/db";
import { imageHash } from "@/lib/dedup";
import { recognizeOrderScreenshot } from "@/lib/ocr";
import { canMutateCollection } from "@/lib/permissions";
import { saveScreenshotToCloudStorage } from "@/lib/cloudbase-storage";
import { assertSupportedScreenshot, imageDataUrl } from "@/lib/storage";
import { validateRecognition, validateRecognitionPlatform } from "@/lib/validation";

const platforms = new Set(["MEITUAN", "B_JIA"]);

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await context.params;
  const form = await request.formData();
  const platform = String(form.get("platform") ?? "");
  const files = form.getAll("file");
  const file = files[0];
  if (!platforms.has(platform) || files.length !== 1 || !(file instanceof File)) {
    return NextResponse.json({ error: "请明确选择平台并上传一张截图" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const collection = await prisma.collectionTask.findUnique({
    where: { id },
    include: { uploads: { select: { platform: true, recognitionStatus: true } } },
  });
  if (!collection) return NextResponse.json({ error: "采集任务不存在" }, { status: 404 });
  if (!canMutateCollection(user, collection)) return NextResponse.json({ error: "无权操作此采集任务" }, { status: 403 });
  if (collection.status === "CONFIRMED") return NextResponse.json({ error: "该采集任务已确认" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  try { assertSupportedScreenshot(bytes, file.type); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "截图不符合要求" }, { status: 400 }); }
  const hash = imageHash(bytes);
  try { await prisma.imageHashReservation.create({ data: { imageHash: hash } }); }
  catch {
    const duplicate = await prisma.upload.findFirst({ where: { imageHash: hash }, include: { collection: { select: { merchantName: true, createdAt: true } } } });
    return NextResponse.json({ status: "DUPLICATE", error: "该截图已有采集记录，请更换截图", duplicateOf: duplicate ? { merchantName: duplicate.collection.merchantName, platform: duplicate.platform, uploadedAt: duplicate.collection.createdAt } : undefined }, { status: 409 });
  }

  const updateTask = async (status: string) => {
    const where = status === "DRAFT"
      ? { id, status: { in: ["DRAFT", "UPLOADING", "RECOGNIZING"] } }
      : { id, status: { not: "CONFIRMED" } };
    const updated = await prisma.collectionTask.updateMany({ where, data: { status } });
    if (status === "DRAFT" && updated.count === 0) return;
    if (updated.count === 0) throw new Error("该采集任务已确认");
  };

  let uploadId: string | undefined;
  try {
    await updateTask("UPLOADING");
    const imageFileId = await saveScreenshotToCloudStorage(bytes, file.type, hash);
    const { randomUUID } = await import("node:crypto");
    const upload = await prisma.upload.create({
      data: { collectionId: id, platform, recognitionStatus: "PROCESSING", imageFileId, imageMimeType: file.type, imageHash: hash, imageAccessToken: randomUUID(), storageReference: imageFileId },
    });
    uploadId = upload.id;
    await updateTask("RECOGNIZING");
    const recognition = await recognizeOrderScreenshot(imageDataUrl(bytes, file.type));
    const validation = validateRecognition(recognition);
    if (!validation.ok) throw new Error(validation.reason);
    const platformValidation = validateRecognitionPlatform(platform as "MEITUAN" | "B_JIA", recognition.platform);
    if (!platformValidation.ok) throw new Error(platformValidation.reason);
    await prisma.upload.update({ where: { id: upload.id }, data: { recognitionStatus: "SUCCEEDED", recognitionResult: JSON.stringify(recognition) } });

    const ready = await prisma.upload.count({ where: { collectionId: id, recognitionStatus: "SUCCEEDED", platform: { in: ["MEITUAN", "B_JIA"] } } }) >= 2;
    await updateTask(ready ? "READY_TO_CONFIRM" : "DRAFT");
    return NextResponse.json({ status: "SUCCEEDED", upload: { id: upload.id, platform, recognitionStatus: "SUCCEEDED", recognitionResult: recognition } }, { status: 201 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "图片识别失败";
    if (!uploadId) { await prisma.imageHashReservation.delete({ where: { imageHash: hash } }).catch(() => undefined); return NextResponse.json({ status: "FAILED", error: "截图存储服务暂不可用，请稍后重试" }, { status: 503 }); }
    if (reason === "该采集任务已确认") { await prisma.upload.delete({ where: { id: uploadId } }).catch(() => undefined); return NextResponse.json({ status: "CONFLICT", error: reason }, { status: 409 }); }
    await prisma.upload.update({ where: { id: uploadId }, data: { recognitionStatus: "FAILED" } });
    await prisma.recognitionFailure.upsert({ where: { uploadId }, create: { uploadId, reason }, update: { reason } });
    await updateTask("FAILED").catch(() => undefined);
    return NextResponse.json({ status: "FAILED", error: reason }, { status: 422 });
  }
}
