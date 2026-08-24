-- Data Center needs a durable source value for merchant-funded activity and an immutable correction trail.
ALTER TABLE "OrderRecord" ADD COLUMN "merchantActivity" REAL NOT NULL DEFAULT 0;
-- SQLite/D1 does not allow a non-constant default while adding a column.
-- Prisma writes this field for every new/updated record; backfill existing records below.
ALTER TABLE "OrderRecord" ADD COLUMN "updatedAt" DATETIME;

-- Existing records did not persist the source value.  Reconstruct the historical amount from the
-- approved equation instead of silently exporting it as zero.
UPDATE "OrderRecord"
SET "merchantActivity" = MAX("dishPrice" + "originalDeliveryFee" - "userPaidAmount", 0);

UPDATE "OrderRecord" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

CREATE TABLE "OrderAuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "actorUsername" TEXT NOT NULL,
  "beforeJson" TEXT NOT NULL,
  "afterJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("orderId") REFERENCES "OrderRecord"("id") ON DELETE CASCADE
);

CREATE INDEX "OrderRecord_city_uploadedAt_idx" ON "OrderRecord"("city", "uploadedAt");
CREATE INDEX "OrderRecord_merchantId_uploadedAt_idx" ON "OrderRecord"("merchantId", "uploadedAt");
CREATE INDEX "OrderAuditLog_orderId_createdAt_idx" ON "OrderAuditLog"("orderId", "createdAt");
