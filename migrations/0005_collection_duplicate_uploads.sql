-- Keep duplicate attempts as traceable collection images instead of discarding them.
-- The existing hash is still used for lookup; uniqueness would prevent recording a DUPLICATE status.
DROP INDEX IF EXISTS "Upload_imageHash_key";
CREATE INDEX IF NOT EXISTS "Upload_imageHash_idx" ON "Upload"("imageHash");
