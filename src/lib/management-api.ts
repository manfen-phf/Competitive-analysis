import type { D1Database } from "@cloudflare/workers-types";
import { NextResponse } from "next/server";
import { getManagementOverview, parseManagementFilters } from "@/lib/management-analytics";

export async function handleManagementAnalyticsGet(request: Request, db: D1Database) {
  const overview = await getManagementOverview(db, parseManagementFilters(new URL(request.url)));
  return NextResponse.json(overview, { headers: { "Cache-Control": "no-store" } });
}

export async function handleManagementFilterOptionsGet(_request: Request, db: D1Database) {
  const [cities, bds, merchants] = await Promise.all([
    db.prepare('SELECT "name" AS "name" FROM "City" ORDER BY "name"').all<{ name: string }>(),
    db.prepare('SELECT "displayName" AS "displayName" FROM "UserAccount" WHERE "role" = \'BD\' AND "isActive" = 1 ORDER BY "displayName"').all<{ displayName: string }>(),
    db.prepare(`SELECT m."id" AS "merchantId", m."name" AS "merchantName", c."name" AS "cityName", u."displayName" AS "bdName"
      FROM "Merchant" m JOIN "City" c ON c."id" = m."cityId"
      LEFT JOIN "MerchantBdAssignment" a ON a."merchantId" = m."id" AND a."effectiveTo" IS NULL
      LEFT JOIN "UserAccount" u ON u."id" = a."bdUserId"
      ORDER BY c."name", m."name"`).all<{ merchantId: string; merchantName: string; cityName: string; bdName: string | null }>(),
  ]);
  return NextResponse.json({
    cities: cities.results.map((row) => row.name),
    bds: bds.results.map((row) => row.displayName),
    merchants: merchants.results.map((row) => ({ ...row, bdName: row.bdName ?? "" })),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function handleManagementMerchantsGet(request: Request, db: D1Database) {
  const url = new URL(request.url);
  const city = url.searchParams.get("city")?.trim();
  const query = url.searchParams.get("query")?.trim();
  const clauses: string[] = [];
  const values: string[] = [];
  if (city) { clauses.push('c."name" = ?'); values.push(city); }
  if (query) { clauses.push('(m."name" LIKE ? OR m."merchantCode" LIKE ?)'); values.push(`%${query}%`, `%${query}%`); }
  const result = await db.prepare(`SELECT m."id" AS "merchantId", m."name" AS "merchantName", c."name" AS "cityName", COALESCE(u."displayName", '') AS "bdName"
    FROM "Merchant" m JOIN "City" c ON c."id" = m."cityId"
    LEFT JOIN "MerchantBdAssignment" a ON a."merchantId" = m."id" AND a."effectiveTo" IS NULL
    LEFT JOIN "UserAccount" u ON u."id" = a."bdUserId"
    ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
    ORDER BY m."name" LIMIT 100`).bind(...values).all<{ merchantId: string; merchantName: string; cityName: string; bdName: string }>();
  return NextResponse.json({ merchants: result.results }, { headers: { "Cache-Control": "no-store" } });
}
