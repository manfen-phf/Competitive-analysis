import type { D1Database } from "@cloudflare/workers-types";
import { NextResponse } from "next/server";
import { createCollection } from "@/lib/bd-collection";
import { createBdSessionValue, readBdSessionValue, type BdSession } from "@/lib/bd-session";
import type { ScreenshotBucket } from "@/lib/r2-storage";

export const BD_SESSION_COOKIE = "bd_session";

type BdApiDependencies = {
  db: D1Database;
  sessionSecret: string;
};

type CollectionApiDependencies = {
  db: D1Database;
  bucket: ScreenshotBucket;
  bd: BdSession;
};

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function cookieValue(request: Request, name: string): string | undefined {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function currentBd(request: Request, sessionSecret: string): Promise<BdSession | null> {
  return readBdSessionValue(cookieValue(request, BD_SESSION_COOKIE), sessionSecret);
}

export async function handleBdIdentitiesGet({ db }: Pick<BdApiDependencies, "db">) {
  const result = await db.prepare(`SELECT "displayName" AS "bdName" FROM "UserAccount" WHERE "role" = 'BD' AND "isActive" = true ORDER BY "displayName"`).all<{ bdName: string }>();
  return NextResponse.json({ items: result.results });
}

export async function handleBdSessionPost(request: Request, dependencies: BdApiDependencies) {
  if (!dependencies.sessionSecret) return error("BD 会话服务尚未配置", 503);
  let bdName = "";
  try { bdName = String((await request.json() as { bdName?: unknown }).bdName ?? "").trim(); } catch { return error("请输入 BD 姓名", 400); }
  if (!bdName) return error("请输入 BD 姓名", 400);

  const result = await dependencies.db.prepare(`SELECT "id", "displayName" FROM "UserAccount" WHERE "role" = 'BD' AND "isActive" = true AND "displayName" = ? LIMIT 1`)
    .bind(bdName).all<{ id: string; displayName: string }>();
  const bd = result.results[0];
  if (!bd) return error("未找到可用的 BD 身份", 404);

  const response = NextResponse.json({ bdName: bd.displayName });
  response.cookies.set(BD_SESSION_COOKIE, await createBdSessionValue({ userId: bd.id, displayName: bd.displayName }, dependencies.sessionSecret), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export function handleBdSessionDelete() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(BD_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

export async function handleBdMerchantsGet(request: Request, dependencies: BdApiDependencies) {
  const bd = await currentBd(request, dependencies.sessionSecret);
  if (!bd) return error("请先选择 BD 身份", 401);
  const url = new URL(request.url);
  const city = url.searchParams.get("city")?.trim() ?? "";
  const query = url.searchParams.get("query")?.trim() ?? "";
  const wildcard = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const result = await dependencies.db.prepare(`SELECT m."id" AS "merchantId", m."merchantCode" AS "merchantCode", m."name" AS "merchantName", c."name" AS "cityName"
    FROM "Merchant" m
    JOIN "City" c ON c."id" = m."cityId"
    JOIN "MerchantBdAssignment" a ON a."merchantId" = m."id" AND a."effectiveTo" IS NULL
    WHERE a."bdUserId" = ? AND (? = '' OR c."name" = ?)
      AND (? = '' OR m."merchantCode" LIKE ? ESCAPE '\\' OR m."name" LIKE ? ESCAPE '\\')
    ORDER BY c."name", m."merchantCode" LIMIT 100`).bind(bd.userId, city, city, query, wildcard, wildcard)
    .all<{ merchantId: string; merchantCode: string; merchantName: string; cityName: string }>();
  return NextResponse.json({ bdName: bd.displayName, items: result.results });
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
}

function asFile(value: FormDataEntryValue | null, name: string): File | NextResponse {
  if (!value || typeof value === "string" || typeof value.arrayBuffer !== "function") return error(`请上传${name}截图`, 400);
  return value as File;
}

export async function handleCollectionPost(request: Request, dependencies: CollectionApiDependencies) {
  const form = await request.formData();
  const merchantId = String(form.get("merchantId") ?? "").trim();
  const originalDeliveryFee = Number(form.get("originalDeliveryFee"));
  if (!Number.isFinite(originalDeliveryFee) || originalDeliveryFee < 0) return error("请填写有效的原价配送费", 400);
  if (!merchantId) return error("请选择商家", 400);
  const meituanFile = asFile(form.get("meituanFile"), "美团");
  const bJiaFile = asFile(form.get("bJiaFile"), "B 家");
  if (meituanFile instanceof NextResponse) return meituanFile;
  if (bJiaFile instanceof NextResponse) return bJiaFile;

  try {
    const [meituanBytes, bJiaBytes] = await Promise.all([meituanFile.arrayBuffer(), bJiaFile.arrayBuffer()]);
    const result = await createCollection({
      db: dependencies.db,
      bucket: dependencies.bucket,
      bdUserId: dependencies.bd.userId,
      merchantId,
      originalDeliveryFee,
      images: [
        { platform: "MEITUAN", imageHash: await sha256(meituanBytes), imageMimeType: meituanFile.type, bytes: new Uint8Array(meituanBytes) },
        { platform: "B_JIA", imageHash: await sha256(bJiaBytes), imageMimeType: bJiaFile.type, bytes: new Uint8Array(bJiaBytes) },
      ],
    });
    return NextResponse.json({ status: "UPLOADED", ...result }, { status: 201 });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "上传失败";
    const status = message.includes("已采集") ? 409 : message.includes("自己负责") ? 403 : 422;
    return error(message, status);
  }
}
