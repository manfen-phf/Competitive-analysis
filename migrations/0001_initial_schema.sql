-- CreateTable
CREATE TABLE "MasterDataVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "MerchantAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "bdName" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "versionId" TEXT NOT NULL,
    CONSTRAINT "MerchantAssignment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "MasterDataVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imagePath" TEXT NOT NULL,
    "imageHash" TEXT NOT NULL,
    "imageAccessToken" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OrderRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
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
    CONSTRAINT "OrderRecord_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecognitionFailure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uploadId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecognitionFailure_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MasterDataVersion_isActive_importedAt_idx" ON "MasterDataVersion"("isActive", "importedAt");

-- CreateIndex
CREATE INDEX "MerchantAssignment_city_merchantId_idx" ON "MerchantAssignment"("city", "merchantId");

-- CreateIndex
CREATE INDEX "MerchantAssignment_merchantId_effectiveFrom_idx" ON "MerchantAssignment"("merchantId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_imageHash_key" ON "Upload"("imageHash");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_imageAccessToken_key" ON "Upload"("imageAccessToken");

-- CreateIndex
CREATE UNIQUE INDEX "OrderRecord_uploadId_key" ON "OrderRecord"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderRecord_orderNumber_key" ON "OrderRecord"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RecognitionFailure_uploadId_key" ON "RecognitionFailure"("uploadId");
