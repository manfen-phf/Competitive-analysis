-- User accounts, sessions, and the single-use bootstrap claim for D1.
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL CHECK ("role" IN ('SUPER_ADMIN', 'CITY_ADMIN', 'BD')),
    "city" TEXT,
    "bdName" TEXT,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AppUser_city_admin_city_required" CHECK ("role" != 'CITY_ADMIN' OR ("city" IS NOT NULL AND length(trim("city")) > 0)),
    CONSTRAINT "AppUser_bd_scope_required" CHECK ("role" != 'BD' OR ("city" IS NOT NULL AND length(trim("city")) > 0 AND "bdName" IS NOT NULL AND length(trim("bdName")) > 0))
);

CREATE TABLE "AppSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AppSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AppBootstrap" (
    "id" TEXT NOT NULL CHECK ("id" = 'first-super-admin'),
    "ownerToken" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppBootstrap_pkey" PRIMARY KEY ("id")
);

CREATE TRIGGER "AppBootstrap_requires_empty_user_table"
BEFORE INSERT ON "AppBootstrap"
WHEN EXISTS (SELECT 1 FROM "AppUser")
BEGIN
    SELECT RAISE(ABORT, 'bootstrap requires empty AppUser table');
END;

CREATE UNIQUE INDEX "AppUser_username_key" ON "AppUser"("username");
CREATE INDEX "AppUser_role_city_idx" ON "AppUser"("role", "city");
CREATE INDEX "AppUser_bdName_idx" ON "AppUser"("bdName");
CREATE UNIQUE INDEX "AppSession_tokenHash_key" ON "AppSession"("tokenHash");
CREATE INDEX "AppSession_expiresAt_idx" ON "AppSession"("expiresAt");
