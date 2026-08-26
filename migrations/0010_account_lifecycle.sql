ALTER TABLE "AppUser" ADD COLUMN "isActive" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "AppUser_role_isActive_idx" ON "AppUser"("role", "isActive");
