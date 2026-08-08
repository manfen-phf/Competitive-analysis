# V1 Technical Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Converge the existing application onto one V1 runtime path: Next.js on Cloudflare Workers, D1 for structured data, R2 for original screenshots, and a Qwen-ready recognition boundary.

**Architecture:** OpenNext produces the Worker entrypoint. Server routes use the Cloudflare D1 binding through the Prisma D1 adapter; original images are addressed by R2 object keys and never by D1 BLOBs. A provider-neutral recognition interface exposes the V1 data contract but does not call a model until P0-3.

**Tech Stack:** GitHub, Next.js/React, OpenNext/Cloudflare Workers, Cloudflare D1, Cloudflare R2, Prisma D1 adapter, TypeScript, Vitest, xlsx.

## Global Constraints

- V1 runtime must not use PostgreSQL, CloudBase, Agnes, or D1 image BLOB storage.
- Do not create user-facing business pages, dashboards, AI workflows, exports, or login functionality in P0-0.
- Preserve legacy code in Git history; do not delete remote data or existing Cloudflare resources.
- Each new runtime behavior starts with a failing test.
- Production verification requires real Cloudflare authentication and read/write checks against the configured D1 and R2 resources.

---

### Task 1: Protect the baseline and make the deployed runtime unambiguous

**Files:**
- Modify: `wrangler.jsonc`
- Modify: `package.json`
- Modify: `src/worker.ts`
- Test: `tests/unit/cloudflare-config.test.ts`

**Interfaces:**
- Produces: an OpenNext Worker entrypoint at `.open-next/worker.js`, `ASSETS`, `DB`, and `SCREENSHOT_BUCKET` bindings.
- Consumes: the existing D1 database id from `wrangler.jsonc`.

- [ ] Write a failing test that requires `wrangler.jsonc` to use `.open-next/worker.js`, bind D1 as `DB`, and bind R2 as `SCREENSHOT_BUCKET`.
- [ ] Run the focused test and verify the failure is caused by the missing R2/OpenNext declarations.
- [ ] Configure OpenNext Worker deployment and mark the raw `src/worker.ts` implementation as legacy-only so it cannot be the V1 entrypoint.
- [ ] Run the focused test and verify it passes.
- [ ] Commit the isolated runtime configuration change.

### Task 2: Establish D1-only runtime persistence and V1 collection schema

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/db.ts`
- Create: `migrations/0003_v1_core_baseline.sql`
- Test: `tests/unit/db-schema.test.ts`

**Interfaces:**
- Produces: a D1-compatible Prisma client and D1 tables for `UserAccount`, `City`, `Merchant`, `MerchantBdAssignment`, `CollectionSession`, `UploadImage`, `RecognitionResult`, `ConfirmedOrder`, and `RecognitionFailureV1`.
- Consumes: Cloudflare binding `DB`.

- [ ] Write failing schema tests asserting SQLite/D1, no `imageData` BLOB in V1 tables, and the collection-session-to-two-platform-images model.
- [ ] Run focused tests and verify the failure reflects absent V1 schema declarations.
- [ ] Add an additive D1 migration. It must not drop existing legacy tables or data.
- [ ] Configure `getPrisma` to require the Worker `DB` binding in production and remove PostgreSQL fallback semantics.
- [ ] Run focused tests and verify they pass.
- [ ] Commit the D1 baseline change.

### Task 3: Add an R2-only screenshot storage boundary

**Files:**
- Modify: `src/lib/storage.ts`
- Create: `src/lib/r2-storage.ts`
- Test: `tests/unit/storage.test.ts`

**Interfaces:**
- Produces: `r2ObjectKey(contentHash, mimeType)`, `saveScreenshot(bucket, input)`, and `readScreenshot(bucket, key)`.
- Consumes: a `R2Bucket` binding and supported image bytes/mime type.

- [ ] Write failing tests for deterministic R2 keys and metadata-only D1 records.
- [ ] Run focused tests and verify they fail because the R2 boundary is absent.
- [ ] Implement the smallest R2 adapter; it must put/read bytes through `R2Bucket` and return only key/mime/hash metadata for D1.
- [ ] Run focused tests and verify they pass.
- [ ] Commit the R2 boundary change.

### Task 4: Replace model-specific runtime calls with a Qwen-ready recognition contract

**Files:**
- Modify: `src/lib/ocr.ts`
- Create: `src/lib/recognition-provider.ts`
- Test: `tests/unit/ocr.test.ts`

**Interfaces:**
- Produces: `RecognitionProvider` and `createQwenRecognitionProvider(config)` with `recognize(input)` left uncalled by P0-0 routes.
- Consumes: `QWEN_API_KEY`, optional `QWEN_MODEL`, and the existing recognition schema.

- [ ] Write a failing test that imports the Qwen provider configuration and verifies no Agnes configuration is required.
- [ ] Run focused tests and verify they fail for the missing provider interface.
- [ ] Isolate the existing model-specific implementation behind the Qwen provider boundary without enabling an upload-to-AI business flow.
- [ ] Run focused tests and verify they pass.
- [ ] Commit the AI boundary change.

### Task 5: Retire legacy runtime routes from the V1 execution path and verify locally

**Files:**
- Modify: `src/app/api/uploads/route.ts`
- Modify: `src/app/api/uploads/[id]/image/route.ts`
- Modify: `tests/unit/cloudflare-config.test.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: no V1 server route that persists image BLOBs, calls Agnes, or calls CloudBase.
- Consumes: the D1 and R2 boundaries from Tasks 2–3.

- [ ] Write failing source-level tests that prevent V1 route imports from `src/worker.ts`, Agnes, CloudBase, PostgreSQL, or `imageData`.
- [ ] Run focused tests and verify they fail for existing legacy route dependencies.
- [ ] Remove legacy dependencies from V1 routes while leaving P0-2/P0-3 behavior intentionally unavailable rather than simulated.
- [ ] Document the exact Cloudflare commands needed for remote D1/R2 verification.
- [ ] Run unit tests, Next.js production build, and OpenNext Worker build.
- [ ] Commit the P0-0 runtime convergence changes.

### Task 6: Perform authenticated Cloudflare and GitHub verification

**Files:**
- No source change required.

**Interfaces:**
- Consumes: Cloudflare CLI authentication, an existing or newly created R2 bucket, Worker deployment rights, and GitHub SSH or token credentials.
- Produces: evidence for remote D1 read/write, R2 put/get/delete, Worker deployment, and GitHub push.

- [ ] Run `wrangler whoami` and verify the intended Cloudflare account.
- [ ] Create or verify the configured R2 bucket, then set the real bucket name in `wrangler.jsonc` only if it differs from the planned name.
- [ ] Apply the additive D1 migration remotely; insert/read/delete a uniquely named verification row.
- [ ] Put/read/delete a uniquely named R2 verification object.
- [ ] Build and deploy the OpenNext Worker, then request its public health endpoint.
- [ ] Push `v1-core` to GitHub and record the resulting commit SHA.

## Review Checklist

- No V1 code path uses PostgreSQL, CloudBase, Agnes, or `Upload.imageData`.
- Legacy tables are not dropped by the D1 migration.
- One `CollectionSession` can own multiple `UploadImage` rows, constrained by `platform` for Meituan and B家.
- P0-0 does not implement P0-1 through P0-6 business flows.
- Real Cloudflare verification is reported as blocked, not simulated, until authenticated commands succeed.
