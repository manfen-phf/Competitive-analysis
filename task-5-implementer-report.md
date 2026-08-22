# Task 5 implementer report

## Delivered

- Added the authenticated paired collection APIs: create task, explicit platform image upload, and transactional confirmation.
- BD authorization is enforced server-side for merchant listing, task creation, image upload, and confirmation. A BD cannot operate a different city or BD's merchant/collection.
- Duplicate image hashes are recorded as `DUPLICATE` attempts, retain the original storage reference, and return the prior merchant/platform/time. Recognition failures retain the upload plus a failure reason.
- Confirmation requires successfully recognized 美团 and B家 images, accepts editable review fields, recalculates all derived values server-side, creates exactly two order records in one transaction, then marks the collection confirmed.
- Replaced the old single-image upload path with an explicit `410` response so it cannot bypass the paired authorization flow.
- Built the responsive three-step collection task UI: owned-merchant selection, original delivery fee, distinct 美团 `#FFC300` and B家 `#2F7DFF` cards, status feedback, editable review and read-only calculated values. Controls use 40px minimum height and the page retains a return-to-overview path.

## TDD evidence

- Added `tests/unit/collection-confirmation.test.ts` before its implementation. The tests were observed failing first because the confirmation/API modules did not exist, then passing after each incremental implementation.
- Passed: `pnpm test tests/unit/collection-confirmation.test.ts tests/unit/order-calculations.test.ts tests/unit/storage.test.ts tests/unit/ocr.test.ts` — 16 tests passed.
- Ran `pnpm prisma generate --no-engine` successfully to refresh the generated client types.
- `pnpm exec tsc --noEmit` now has no Task 5 failures. It remains blocked by two pre-existing unrelated errors: `src/lib/auth.ts(118)` role string typing and `tests/unit/master-data.test.ts(10)` strict null checking.

## Scope and risks

- No deployment was run.
- Browser visual QA was intentionally not used as a completion gate for this implementation pass; backend services require configured runtime credentials. The UI is covered by the responsive implementation and type/test checks above, but real CloudBase/OCR end-to-end verification remains required in a configured environment.
- Existing unrelated working-tree changes were left unstaged.

## Review follow-up

- Duplicate requests now return only `DUPLICATE` audit metadata and never create an upload, copy a storage file ID, mint an image token, or return a bearer capability. Image retrieval additionally requires an authenticated user with collection scope.
- OCR platform is compared to the explicit requested platform; a mismatch follows the persisted recognition-failure path with the actionable mismatch reason.
- Added `platformRedPacketMerchantShare` to OCR extraction/validation, editable review state/UI, confirmation records, Prisma schema, and D1 migration `0006_order_red_packet_merchant_share.sql`.
- Confirmation returns a stable successful result for an already-confirmed task. A conditional `READY_TO_CONFIRM → CONFIRMED` update is executed inside the transaction before order creation, preventing repeated/concurrent creation; order records now retain each screenshot's original upload timestamp.
- Added regression assertions for safe duplicate rejection, OCR platform mismatch validation, idempotent confirmation, red-packet merchant share, and preserved upload timestamps.

## Final review follow-up

- Added a D1-compatible `ImageHashReservation` primary-key table. The route atomically reserves the SHA-256 hash before storage, so parallel same-hash attempts receive the same safe duplicate rejection and cannot expose an image capability.
- A zero-row confirmation transition now verifies persisted `CONFIRMED` status and exactly two collection orders before returning idempotent success; all other states return a conflict. Upload readiness is recalculated from persisted successful uploads rather than a stale request snapshot.
- Updated the shared validation fixture and added a regression test for missing `platformRedPacketMerchantShare`.

## Approval review follow-up

- Guarded collection upload status writes with a conditional non-confirmed update; a confirmation race returns conflict and removes the just-created upload rather than regressing `CONFIRMED`.
- Confirmed retries now prove persisted `CONFIRMED` plus exactly two collection orders before success; legacy/incomplete confirmations remain conflicts.
- Expanded D1 migration regression through migrations 0001–0007, including the new column/table and a duplicate reservation uniqueness check. Duplicate responses now include only safe merchant/platform/collection-time metadata.

- Standardized duplicate audit time as `duplicateOf.uploadedAt`, matching the collection UI display contract; the regression test covers the safe merchant/platform/time payload.

- Prevented a slower one-success upload from overwriting a concurrently established `READY_TO_CONFIRM` pair with `DRAFT`; only pre-ready states can now transition to `DRAFT`.
