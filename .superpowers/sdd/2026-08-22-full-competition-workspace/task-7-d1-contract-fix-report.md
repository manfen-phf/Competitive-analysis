# Task 7 D1 contract fix

## Root cause reproduced

- A fresh replay of migrations `0001`–`0008` produced an `Upload` table without `imageFileId`, while the protected original-image endpoint read that field.
- `0008_order_data_center.sql` creates `OrderRecord.updatedAt` as nullable, but Prisma declared it required.

## Change

- `0009_r2_upload_contract.sql` adds nullable `Upload.imageFileId`; old `legacyImageData` is retained for historical rows.
- New screenshots save their deterministic hash key to the `SCREENSHOTS` R2 binding. The protected reader resolves that key from R2 and only falls back to non-empty legacy D1 bytes; no CloudBase runtime module is used on the V1 screenshot path.
- Prisma makes `Upload.imageFileId` and `OrderRecord.updatedAt` nullable to match the replayed D1 schema.
- The D1 migration test now replays `0004`–`0009` both directly and within one transaction, and asserts the R2 key column exists.

## Evidence

- RED: before `0009`, `tests/unit/d1-collection-migration.test.ts` failed in both modes with `hasR2ImageKey: false`; before the schema change, `tests/unit/db-schema.test.ts` failed because `updatedAt` was required.
- GREEN: `DATABASE_URL=file:./dev.db pnpm exec prisma validate --schema prisma/schema.prisma` passed (only the existing `driverAdapters` deprecation warning).
- `pnpm exec prisma generate` passed.
- Focused verification passed: 9 files / 35 tests, including direct and transactional D1 replay and R2 read/write behavior.
- `pnpm exec tsc --noEmit` still reports only the pre-existing `src/lib/auth.ts` AppRole mismatch and `tests/unit/master-data.test.ts` possible-undefined error; no Task 7 path error was reported.
- `pnpm run build` reached `Compiled successfully`; the command's type-checking tail was not allowed to complete by the 30-second command window. It also produced pre-existing webpack cache and CSS autoprefixer warnings.

## Scope

Only D1/R2 contract files and their regression tests are staged. Existing uncommitted CloudBase/PostgreSQL history remains untouched and is not included.
