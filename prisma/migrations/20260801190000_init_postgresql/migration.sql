-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "MasterDataVersion" (
    "id" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MasterDataVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MerchantAssignment" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "bdName" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "versionId" TEXT NOT NULL,
    CONSTRAINT "MerchantAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "imageData" BYTEA NOT NULL,
    "imageMimeType" TEXT NOT NULL,
    "imageHash" TEXT NOT NULL,
    "imageAccessToken" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderRecord" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL,
    "bdName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dishPrice" DOUBLE PRECISION NOT NULL,
    "packagingFee" DOUBLE PRECISION NOT NULL,
    "platformRedPacket" DOUBLE PRECISION NOT NULL,
    "originalDeliveryFee" DOUBLE PRECISION NOT NULL,
    "deliveryFeeReduction" DOUBLE PRECISION NOT NULL,
    "paidDeliveryFee" DOUBLE PRECISION NOT NULL,
    "merchantSettlementAmount" DOUBLE PRECISION NOT NULL,
    "userPaidAmount" DOUBLE PRECISION NOT NULL,
    "otherPromotion" DOUBLE PRECISION NOT NULL,
    "technicalServiceFee" DOUBLE PRECISION NOT NULL,
    "deliveryServiceFee" DOUBLE PRECISION NOT NULL,
    "merchantRate" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "OrderRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecognitionFailure" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecognitionFailure_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MasterDataVersion_isActive_importedAt_idx" ON "MasterDataVersion"("isActive", "importedAt");
CREATE INDEX "MerchantAssignment_city_merchantId_idx" ON "MerchantAssignment"("city", "merchantId");
CREATE INDEX "MerchantAssignment_merchantId_effectiveFrom_idx" ON "MerchantAssignment"("merchantId", "effectiveFrom");
CREATE UNIQUE INDEX "Upload_imageHash_key" ON "Upload"("imageHash");
CREATE UNIQUE INDEX "Upload_imageAccessToken_key" ON "Upload"("imageAccessToken");
CREATE UNIQUE INDEX "OrderRecord_uploadId_key" ON "OrderRecord"("uploadId");
CREATE UNIQUE INDEX "OrderRecord_orderNumber_key" ON "OrderRecord"("orderNumber");
CREATE UNIQUE INDEX "RecognitionFailure_uploadId_key" ON "RecognitionFailure"("uploadId");

ALTER TABLE "MerchantAssignment" ADD CONSTRAINT "MerchantAssignment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "MasterDataVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderRecord" ADD CONSTRAINT "OrderRecord_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecognitionFailure" ADD CONSTRAINT "RecognitionFailure_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;