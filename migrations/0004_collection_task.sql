-- Paired collection tasks for Cloudflare D1 / SQLite.
-- D1 migrations run inside a transaction and keep foreign-key enforcement enabled.
-- Deferral is the D1-supported mechanism for the temporary schema changes below.
PRAGMA defer_foreign_keys = on;

CREATE TABLE "CollectionTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "bdName" TEXT NOT NULL,
    "originalDeliveryFee" REAL NOT NULL,
    "createdByUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT', 'UPLOADING', 'RECOGNIZING', 'READY_TO_CONFIRM', 'CONFIRMED', 'FAILED')),
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Legacy screenshots did not capture collection metadata. Where an order exists, its fields are
-- retained; otherwise explicit legacy placeholders preserve the upload without inventing a platform.
INSERT INTO "CollectionTask" (
    "id", "merchantId", "merchantName", "city", "bdName", "originalDeliveryFee",
    "createdByUserId", "status", "createdAt", "updatedAt"
)
SELECT
    'legacy-' || u."id",
    COALESCE(NULLIF(o."merchantId", ''), 'legacy:' || u."id"),
    COALESCE(NULLIF(o."merchantName", ''), '历史未知商家'),
    COALESCE(NULLIF(o."city", ''), '历史未知城市'),
    COALESCE(NULLIF(o."bdName", ''), '历史未知BD'),
    COALESCE(o."originalDeliveryFee", 0),
    NULL,
    CASE
        WHEN o."id" IS NOT NULL THEN 'CONFIRMED'
        WHEN rf."id" IS NOT NULL THEN 'FAILED'
        ELSE 'READY_TO_CONFIRM'
    END,
    u."uploadedAt",
    u."uploadedAt"
FROM "Upload" u
LEFT JOIN "OrderRecord" o ON o."uploadId" = u."id"
LEFT JOIN "RecognitionFailure" rf ON rf."uploadId" = u."id";

CREATE TABLE "new_Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "platform" TEXT CHECK ("platform" IN ('MEITUAN', 'B_JIA') OR "platform" IS NULL),
    "recognitionStatus" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("recognitionStatus" IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DUPLICATE')),
    "recognitionResult" TEXT,
    "storageReference" TEXT,
    "legacyImageData" BLOB,
    "imageMimeType" TEXT NOT NULL,
    "imageHash" TEXT NOT NULL,
    "imageAccessToken" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "CollectionTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Upload" (
    "id", "collectionId", "platform", "recognitionStatus", "recognitionResult", "storageReference",
    "legacyImageData", "imageMimeType", "imageHash", "imageAccessToken", "uploadedAt"
)
SELECT
    u."id",
    'legacy-' || u."id",
    o."platform",
    CASE
        WHEN o."id" IS NOT NULL THEN 'SUCCEEDED'
        WHEN rf."id" IS NOT NULL THEN 'FAILED'
        ELSE 'PENDING'
    END,
    NULL,
    NULL,
    u."imageData",
    u."imageMimeType",
    u."imageHash",
    u."imageAccessToken",
    u."uploadedAt"
FROM "Upload" u
LEFT JOIN "OrderRecord" o ON o."uploadId" = u."id"
LEFT JOIN "RecognitionFailure" rf ON rf."uploadId" = u."id";

-- Upload has restrictive child tables, so rebuild and detach them before replacing Upload.
-- The temporary child tables reference new_Upload, which SQLite rewrites to Upload on rename.
CREATE TABLE "new_OrderRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "platform" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL,
    "bdName" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dishPrice" REAL NOT NULL,
    "packagingFee" REAL NOT NULL,
    "platformRedPacket" REAL NOT NULL,
    "originalDeliveryFee" REAL NOT NULL,
    "deliveryFeeReduction" REAL NOT NULL,
    "paidDeliveryFee" REAL NOT NULL,
    "merchantSettlementAmount" REAL NOT NULL,
    "userPaidAmount" REAL NOT NULL,
    "otherPromotion" REAL NOT NULL,
    "technicalServiceFee" REAL NOT NULL,
    "deliveryServiceFee" REAL NOT NULL,
    "merchantRate" REAL NOT NULL,
    CONSTRAINT "OrderRecord_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "new_Upload" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_OrderRecord" (
    "id", "uploadId", "orderNumber", "platform", "merchantId", "merchantName", "city", "bdName", "uploadedAt",
    "dishPrice", "packagingFee", "platformRedPacket", "originalDeliveryFee", "deliveryFeeReduction",
    "paidDeliveryFee", "merchantSettlementAmount", "userPaidAmount", "otherPromotion",
    "technicalServiceFee", "deliveryServiceFee", "merchantRate"
)
SELECT
    "id", "uploadId", "orderNumber", "platform", "merchantId", "merchantName", "city", "bdName", "uploadedAt",
    "dishPrice", "packagingFee", "platformRedPacket", "originalDeliveryFee", "deliveryFeeReduction",
    "paidDeliveryFee", "merchantSettlementAmount", "userPaidAmount", "otherPromotion",
    "technicalServiceFee", "deliveryServiceFee", "merchantRate"
FROM "OrderRecord";

CREATE TABLE "new_RecognitionFailure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecognitionFailure_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "new_Upload" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_RecognitionFailure" ("id", "uploadId", "reason", "createdAt")
SELECT "id", "uploadId", "reason", "createdAt" FROM "RecognitionFailure";

DROP TABLE "OrderRecord";
DROP TABLE "RecognitionFailure";
DROP TABLE "Upload";
ALTER TABLE "new_Upload" RENAME TO "Upload";
ALTER TABLE "new_OrderRecord" RENAME TO "OrderRecord";
ALTER TABLE "new_RecognitionFailure" RENAME TO "RecognitionFailure";

CREATE UNIQUE INDEX "Upload_imageHash_key" ON "Upload"("imageHash");
CREATE UNIQUE INDEX "Upload_imageAccessToken_key" ON "Upload"("imageAccessToken");
CREATE INDEX "Upload_collectionId_platform_idx" ON "Upload"("collectionId", "platform");
CREATE INDEX "Upload_recognitionStatus_idx" ON "Upload"("recognitionStatus");
CREATE UNIQUE INDEX "OrderRecord_uploadId_key" ON "OrderRecord"("uploadId");
CREATE UNIQUE INDEX "OrderRecord_orderNumber_key" ON "OrderRecord"("orderNumber");
CREATE UNIQUE INDEX "RecognitionFailure_uploadId_key" ON "RecognitionFailure"("uploadId");

CREATE INDEX "CollectionTask_merchantId_createdAt_idx" ON "CollectionTask"("merchantId", "createdAt");
CREATE INDEX "CollectionTask_city_bdName_status_idx" ON "CollectionTask"("city", "bdName", "status");
CREATE INDEX "CollectionTask_createdByUserId_idx" ON "CollectionTask"("createdByUserId");

CREATE TRIGGER "CollectionTask_updatedAt"
AFTER UPDATE ON "CollectionTask"
FOR EACH ROW WHEN NEW."updatedAt" = OLD."updatedAt"
BEGIN
    UPDATE "CollectionTask" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = OLD."id";
END;
