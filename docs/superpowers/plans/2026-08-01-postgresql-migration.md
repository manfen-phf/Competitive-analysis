# PostgreSQL Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the CloudBase deployment against Tencent Cloud PostgreSQL without changing user-facing upload, import, or dashboard behavior.

**Architecture:** Prisma's datasource moves from SQLite/D1 to PostgreSQL. The shared `getPrisma()` factory creates one standard Prisma client from `DATABASE_URL`; Cloudflare-specific D1 adapters are removed from the production database path. Secrets remain CloudBase environment variables.

**Tech Stack:** Next.js 15, Prisma 6, PostgreSQL, pnpm, Vitest, Tencent CloudBase.

## Global Constraints

- Preserve all existing models, field names, API routes, and business calculations.
- Do not commit secrets, database URLs, user workbooks, or uploaded images.
- `DATABASE_URL` must be configured in CloudBase before database-backed routes are used.

---

### Task 1: Make the Prisma schema portable to PostgreSQL

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `.env.example`
- Test: `tests/unit/db-schema.test.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` environment variable.
- Produces: Prisma client generated for PostgreSQL and a documented CloudBase connection-string placeholder.

- [ ] Change datasource provider from `sqlite` to `postgresql` and remove the D1-only `driverAdapters` preview feature.
- [ ] Keep all model and index names unchanged; map `Upload.imageData` to PostgreSQL `bytea` through Prisma's `Bytes` type.
- [ ] Change `.env.example` from a SQLite file URL to `postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public`.
- [ ] Update the schema unit test to require `provider = "postgresql"` and `DATABASE_URL`.
- [ ] Run `pnpm prisma generate` and `pnpm vitest run tests/unit/db-schema.test.ts`.

### Task 2: Replace Cloudflare D1 database factory

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `package.json`
- Modify: `tests/unit/cloudflare-config.test.ts`
- Modify: `tests/unit/db-schema.test.ts`

**Interfaces:**
- Produces: `getPrisma(): Promise<PrismaClient>` using `new PrismaClient()`.
- Fails with: an explicit error when `DATABASE_URL` is missing in production.

- [ ] Remove imports and dynamic loading for `@cloudflare/workers-types`, `@opennextjs/cloudflare`, and `@prisma/adapter-d1` from `src/lib/db.ts`.
- [ ] Keep a global Prisma singleton and validate `process.env.DATABASE_URL` before creating the client in production.
- [ ] Remove D1 adapter runtime dependency from `package.json` only after confirming no production source file imports it.
- [ ] Update Cloudflare configuration tests to assert that database code does not import D1 adapter packages.
- [ ] Run `pnpm vitest run tests/unit/db-schema.test.ts tests/unit/cloudflare-config.test.ts`.

### Task 3: Add CloudBase migration and deployment verification

**Files:**
- Create: `prisma/migrations/20260801_init_postgresql/migration.sql`
- Modify: `Dockerfile`
- Modify: `README.md`

**Interfaces:**
- Consumes: CloudBase `DATABASE_URL`, `AGNES_API_KEY`, and `ADMIN_IMPORT_PASSCODE`.
- Produces: PostgreSQL schema migration and documented deployment steps.

- [ ] Generate an initial PostgreSQL migration from the Prisma schema without applying it to a remote database.
- [ ] Make the Docker build run `prisma generate` through the existing `prebuild` script; do not embed database credentials in the image.
- [ ] Document exact CloudBase environment-variable names and the migration command `pnpm prisma migrate deploy`.
- [ ] Run `pnpm test` and `pnpm run build`.
- [ ] Commit only code, tests, migration SQL, Docker configuration, and documentation.
