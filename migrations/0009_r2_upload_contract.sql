-- V1 screenshot objects live in Cloudflare R2.  D1 stores the R2 object key only;
-- legacy inline bytes remain available for historical rows during the transition.
ALTER TABLE "Upload" ADD COLUMN "imageFileId" TEXT;
