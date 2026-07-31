PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Upload" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "imageData" BLOB NOT NULL,
  "imageMimeType" TEXT NOT NULL,
  "imageHash" TEXT NOT NULL,
  "imageAccessToken" TEXT NOT NULL,
  "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Upload" ("id", "imageData", "imageMimeType", "imageHash", "imageAccessToken", "uploadedAt")
SELECT "id", X'', 'application/octet-stream', "imageHash", "imageAccessToken", "uploadedAt" FROM "Upload";
DROP TABLE "Upload";
ALTER TABLE "new_Upload" RENAME TO "Upload";
CREATE UNIQUE INDEX "Upload_imageHash_key" ON "Upload"("imageHash");
CREATE UNIQUE INDEX "Upload_imageAccessToken_key" ON "Upload"("imageAccessToken");
PRAGMA foreign_keys=ON;
