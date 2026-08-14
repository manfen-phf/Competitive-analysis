import type { D1Database } from "@cloudflare/workers-types";
import { NextResponse } from "next/server";
import { syncMasterData } from "@/lib/d1-master-data";
import { parseMasterDataWorkbook } from "@/lib/master-data-import";

export type MasterDataDependencies = {
  db: D1Database;
  adminPasscode: string;
};

type MerchantListRow = {
  cityName: string;
  merchantCode: string;
  merchantName: string;
  bdName: string;
  effectiveFrom: string;
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function importDay(form: FormData): string {
  const supplied = String(form.get("effectiveFrom") ?? "").trim();
  return supplied || new Date().toISOString().slice(0, 10);
}

export async function handleMasterDataPost(request: Request, dependencies: MasterDataDependencies) {
  const form = await request.formData();
  const passcode = String(form.get("passcode") ?? "");
  if (!dependencies.adminPasscode || passcode !== dependencies.adminPasscode) return jsonError("管理员口令错误", 401);
  if (form.get("verifyOnly") === "true") return NextResponse.json({ valid: true });

  const file = form.get("file");
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") return jsonError("请选择 Excel 文件", 400);
  if (!/\.xlsx?$/i.test(file.name)) return jsonError("仅支持 .xlsx 或 .xls 文件", 422);

  try {
    const preview = parseMasterDataWorkbook(await file.arrayBuffer(), importDay(form));
    const summary = await syncMasterData(dependencies.db, preview.rows);
    return NextResponse.json({ imported: summary.totalRows, ...summary });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Excel 校验或导入失败", 422);
  }
}

export async function handleMasterDataGet(request: Request, db: D1Database) {
  const url = new URL(request.url);
  const city = url.searchParams.get("city")?.trim() ?? "";
  const query = url.searchParams.get("query")?.trim() ?? "";
  const bd = url.searchParams.get("bd")?.trim() ?? "";
  const wildcard = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;

  const [items, cities, bds] = await Promise.all([
    db.prepare(`SELECT c."name" AS cityName, m."merchantCode" AS merchantCode, m."name" AS merchantName, u."displayName" AS bdName, a."effectiveFrom" AS effectiveFrom
      FROM "Merchant" m
      JOIN "City" c ON c."id" = m."cityId"
      JOIN "MerchantBdAssignment" a ON a."merchantId" = m."id" AND a."effectiveTo" IS NULL
      JOIN "UserAccount" u ON u."id" = a."bdUserId"
      WHERE (? = '' OR c."name" = ?)
        AND (? = '' OR u."displayName" = ?)
        AND (? = '' OR m."merchantCode" LIKE ? ESCAPE '\\' OR m."name" LIKE ? ESCAPE '\\')
      ORDER BY c."name", m."merchantCode"
      LIMIT 100`).bind(city, city, bd, bd, query, wildcard, wildcard).all<MerchantListRow>(),
    db.prepare(`SELECT "name" AS value FROM "City" ORDER BY "name"`).all<{ value: string }>(),
    db.prepare(`SELECT "displayName" AS value FROM "UserAccount" WHERE "role" = 'BD' AND "isActive" = true ORDER BY "displayName"`).all<{ value: string }>(),
  ]);

  return NextResponse.json({
    items: items.results,
    filters: { cities: cities.results.map((item) => item.value), bds: bds.results.map((item) => item.value) },
  });
}
