import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types";
import { chunkStatements } from "@/lib/d1-batch";
import type { NormalizedMerchantRow } from "@/lib/master-data-import";

type ExistingMerchant = { cityName: string; merchantCode: string; merchantName: string };
type ExistingBd = { externalSubject: string };
type ExistingAssignment = { merchantId: string; bdUserId: string };

export type ImportSummary = {
  totalRows: number;
  insertedMerchants: number;
  updatedMerchants: number;
  insertedBds: number;
  updatedAssignments: number;
  cityCount: number;
  bdCount: number;
};

const merchantIdFor = (row: Pick<NormalizedMerchantRow, "cityName" | "merchantCode">) => `merchant:${row.cityName}:${row.merchantCode}`;
const cityIdFor = (cityName: string) => `city:${cityName}`;
const bdIdFor = (bdName: string) => `bd:${bdName}`;

function previousUtcDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString();
}

async function existingRows<T>(db: D1Database, sql: string): Promise<T[]> {
  const result = await db.prepare(sql).all<T>();
  return result.results;
}

export async function syncMasterData(db: D1Database, rows: NormalizedMerchantRow[]): Promise<ImportSummary> {
  const [existingMerchants, existingBds, existingAssignments] = await Promise.all([
    existingRows<ExistingMerchant>(db, `SELECT c."name" AS cityName, m."merchantCode" AS merchantCode, m."name" AS merchantName FROM "Merchant" m JOIN "City" c ON c."id" = m."cityId"`),
    existingRows<ExistingBd>(db, `SELECT "externalSubject" AS externalSubject FROM "UserAccount" WHERE "role" = 'BD'`),
    existingRows<ExistingAssignment>(db, `SELECT "merchantId" AS merchantId, "bdUserId" AS bdUserId FROM "MerchantBdAssignment" WHERE "effectiveTo" IS NULL`),
  ]);

  const merchantByKey = new Map(existingMerchants.map((item) => [`${item.cityName}\u0000${item.merchantCode}`, item]));
  const bdSubjects = new Set(existingBds.map((item) => item.externalSubject));
  const activeBdByMerchantId = new Map(existingAssignments.map((item) => [item.merchantId, item.bdUserId]));
  const cities = new Set(rows.map((row) => row.cityName));
  const bds = new Set(rows.map((row) => row.bdName));

  const summary: ImportSummary = {
    totalRows: rows.length,
    insertedMerchants: 0,
    updatedMerchants: 0,
    insertedBds: 0,
    updatedAssignments: 0,
    cityCount: cities.size,
    bdCount: bds.size,
  };
  const statements: D1PreparedStatement[] = [];

  for (const cityName of cities) {
    statements.push(db.prepare(`INSERT INTO "City" ("id", "name") VALUES (?, ?) ON CONFLICT("name") DO NOTHING`).bind(cityIdFor(cityName), cityName));
  }

  for (const bdName of bds) {
    const externalSubject = bdIdFor(bdName);
    if (!bdSubjects.has(externalSubject)) summary.insertedBds += 1;
    statements.push(db.prepare(`INSERT INTO "UserAccount" ("id", "externalSubject", "displayName", "role", "isActive") VALUES (?, ?, ?, 'BD', true) ON CONFLICT("externalSubject") DO UPDATE SET "displayName" = excluded."displayName", "isActive" = true`).bind(externalSubject, externalSubject, bdName));
  }

  for (const row of rows) {
    const merchantId = merchantIdFor(row);
    const merchantKey = `${row.cityName}\u0000${row.merchantCode}`;
    const existingMerchant = merchantByKey.get(merchantKey);
    if (!existingMerchant) summary.insertedMerchants += 1;
    else if (existingMerchant.merchantName !== row.merchantName) summary.updatedMerchants += 1;

    statements.push(db.prepare(`INSERT INTO "Merchant" ("id", "merchantCode", "name", "cityId") VALUES (?, ?, ?, ?) ON CONFLICT("merchantCode", "cityId") DO UPDATE SET "name" = excluded."name"`).bind(merchantId, row.merchantCode, row.merchantName, cityIdFor(row.cityName)));

    const bdUserId = bdIdFor(row.bdName);
    if (activeBdByMerchantId.get(merchantId) === bdUserId) continue;

    statements.push(db.prepare(`UPDATE "MerchantBdAssignment" SET "effectiveTo" = ? WHERE "merchantId" = ? AND "effectiveTo" IS NULL AND "bdUserId" <> ?`).bind(previousUtcDay(row.effectiveFrom), merchantId, bdUserId));
    statements.push(db.prepare(`INSERT INTO "MerchantBdAssignment" ("id", "merchantId", "bdUserId", "effectiveFrom") VALUES (?, ?, ?, ?)`).bind(`assignment:${merchantId}:${bdUserId}:${row.effectiveFrom}`, merchantId, bdUserId, `${row.effectiveFrom}T00:00:00.000Z`));
    summary.updatedAssignments += 1;
  }

  for (const batch of chunkStatements(statements)) await db.batch(batch);
  return summary;
}
