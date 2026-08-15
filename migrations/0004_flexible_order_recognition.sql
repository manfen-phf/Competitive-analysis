-- Flexible recognition is additive: legacy strict order records remain untouched.
ALTER TABLE "CollectionSession" ADD COLUMN "originalDeliveryFee" REAL;

CREATE TABLE "ConfirmedOrderV1" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "collectionSessionId" TEXT NOT NULL,
  "uploadImageId" TEXT NOT NULL UNIQUE,
  "platform" TEXT NOT NULL CHECK ("platform" IN ('MEITUAN', 'B_JIA')),
  "orderNumber" TEXT,
  "goodsTotal" REAL NOT NULL,
  "dishPrice" REAL NOT NULL,
  "packagingFee" REAL,
  "merchantActivityAmount" REAL,
  "originalDeliveryFee" REAL NOT NULL,
  "deliveryFeeReduction" REAL,
  "paidDeliveryFee" REAL,
  "platformRedPacketAmount" REAL,
  "platformRedPacketMerchantShare" REAL,
  "merchantSettlementAmount" REAL,
  "userPaidAmount" REAL,
  "technicalServiceFee" REAL,
  "deliveryServiceFee" REAL,
  "merchantRate" REAL,
  "confirmedById" TEXT,
  "confirmedAt" DATETIME,
  CONSTRAINT "ConfirmedOrderV1_collectionSessionId_fkey" FOREIGN KEY ("collectionSessionId") REFERENCES "CollectionSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ConfirmedOrderV1_uploadImageId_fkey" FOREIGN KEY ("uploadImageId") REFERENCES "UploadImage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ConfirmedOrderV1_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "UserAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ConfirmedOrderV1_collectionSessionId_platform_key" UNIQUE ("collectionSessionId", "platform")
);

CREATE INDEX "ConfirmedOrderV1_collectionSessionId_idx" ON "ConfirmedOrderV1"("collectionSessionId");
CREATE INDEX "ConfirmedOrderV1_orderNumber_idx" ON "ConfirmedOrderV1"("orderNumber");
