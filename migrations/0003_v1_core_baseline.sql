-- V1 baseline: structured records remain in D1; original screenshots live in R2.
-- This migration is additive and deliberately retains the legacy tables from 0001/0002.
PRAGMA foreign_keys = ON;

CREATE TABLE "UserAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "externalSubject" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "City" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Merchant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "merchantCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cityId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Merchant_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Merchant_merchantCode_cityId_key" UNIQUE ("merchantCode", "cityId")
);

CREATE TABLE "MerchantBdAssignment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "merchantId" TEXT NOT NULL,
  "bdUserId" TEXT NOT NULL,
  "effectiveFrom" DATETIME NOT NULL,
  "effectiveTo" DATETIME,
  CONSTRAINT "MerchantBdAssignment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MerchantBdAssignment_bdUserId_fkey" FOREIGN KEY ("bdUserId") REFERENCES "UserAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "CollectionSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "merchantId" TEXT NOT NULL,
  "bdUserId" TEXT NOT NULL,
  "collectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  CONSTRAINT "CollectionSession_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CollectionSession_bdUserId_fkey" FOREIGN KEY ("bdUserId") REFERENCES "UserAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "UploadImage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "collectionSessionId" TEXT NOT NULL,
  "platform" TEXT NOT NULL CHECK ("platform" IN ('MEITUAN', 'B_JIA')),
  "r2Key" TEXT NOT NULL UNIQUE,
  "imageHash" TEXT NOT NULL UNIQUE,
  "imageMimeType" TEXT NOT NULL,
  "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedById" TEXT NOT NULL,
  CONSTRAINT "UploadImage_collectionSessionId_fkey" FOREIGN KEY ("collectionSessionId") REFERENCES "CollectionSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UploadImage_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "UserAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UploadImage_collectionSessionId_platform_key" UNIQUE ("collectionSessionId", "platform")
);

CREATE TABLE "RecognitionResult" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "uploadImageId" TEXT NOT NULL UNIQUE,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "rawJson" TEXT,
  "structuredJson" TEXT,
  "confidence" REAL,
  "recognizedAt" DATETIME,
  CONSTRAINT "RecognitionResult_uploadImageId_fkey" FOREIGN KEY ("uploadImageId") REFERENCES "UploadImage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ConfirmedOrder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "collectionSessionId" TEXT NOT NULL,
  "uploadImageId" TEXT NOT NULL UNIQUE,
  "platform" TEXT NOT NULL CHECK ("platform" IN ('MEITUAN', 'B_JIA')),
  "orderNumber" TEXT NOT NULL,
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
  "confirmedById" TEXT,
  "confirmedAt" DATETIME,
  CONSTRAINT "ConfirmedOrder_collectionSessionId_fkey" FOREIGN KEY ("collectionSessionId") REFERENCES "CollectionSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ConfirmedOrder_uploadImageId_fkey" FOREIGN KEY ("uploadImageId") REFERENCES "UploadImage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ConfirmedOrder_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "UserAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ConfirmedOrder_collectionSessionId_platform_key" UNIQUE ("collectionSessionId", "platform")
);

CREATE TABLE "RecognitionFailureV1" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "uploadImageId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecognitionFailureV1_uploadImageId_fkey" FOREIGN KEY ("uploadImageId") REFERENCES "UploadImage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "UserAccount_role_isActive_idx" ON "UserAccount"("role", "isActive");
CREATE INDEX "Merchant_cityId_merchantCode_idx" ON "Merchant"("cityId", "merchantCode");
CREATE INDEX "MerchantBdAssignment_merchantId_effectiveFrom_idx" ON "MerchantBdAssignment"("merchantId", "effectiveFrom");
CREATE INDEX "MerchantBdAssignment_bdUserId_effectiveFrom_idx" ON "MerchantBdAssignment"("bdUserId", "effectiveFrom");
CREATE INDEX "CollectionSession_merchantId_collectedAt_idx" ON "CollectionSession"("merchantId", "collectedAt");
CREATE INDEX "CollectionSession_bdUserId_collectedAt_idx" ON "CollectionSession"("bdUserId", "collectedAt");
CREATE INDEX "UploadImage_collectionSessionId_uploadedAt_idx" ON "UploadImage"("collectionSessionId", "uploadedAt");
CREATE INDEX "RecognitionResult_provider_status_idx" ON "RecognitionResult"("provider", "status");
CREATE INDEX "ConfirmedOrder_orderNumber_idx" ON "ConfirmedOrder"("orderNumber");
CREATE INDEX "RecognitionFailureV1_uploadImageId_createdAt_idx" ON "RecognitionFailureV1"("uploadImageId", "createdAt");
