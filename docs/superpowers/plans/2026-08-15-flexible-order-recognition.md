# Flexible Order Recognition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support variable 美团/B家 screenshot fields while retaining only `goodsTotal` as required and persisting BD-entered original delivery fee.

**Architecture:** Add an additive D1 migration for collection delivery fee and a flexible confirmed-order table. Keep raw model output in `RecognitionResult`, normalize it through a single service, and calculate derived values before rendering or confirming.

**Tech Stack:** Next.js, TypeScript, Vitest, Cloudflare D1/R2/Workers, Qwen compatible API.

## Global Constraints

- V1 data uses Cloudflare D1 and R2 only.
- `goodsTotal` is mandatory; all other screenshot fields are nullable.
- Use image hash as the only duplicate-upload guard.
- Do not delete historical tables or image evidence.
- User paid uses `goodsTotal + originalDeliveryFee - merchantActivityAmount`.
- Merchant rate uses `(technicalServiceFee + deliveryServiceFee) / goodsTotal`.

---

### Task 1: Flexible order contract and calculations

**Files:**
- Modify: `src/lib/validation.ts`
- Modify: `src/lib/recognition-provider.ts`
- Create: `tests/unit/flexible-recognition.test.ts`

**Interfaces:**
- Produces `FlexibleRecognitionResult`, `normalizeRecognitionResult`, and `calculateOrderMetrics`.
- `FlexibleRecognitionResult` contains `platform`, `goodsTotal`, nullable extracted fields, and calculated fields.

- [ ] **Step 1: Write failing tests** for absent optional fields, dish-price fallback, user-paid calculation, and merchant-rate calculation.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/flexible-recognition.test.ts` and confirm failure.
- [ ] **Step 3: Implement** a schema requiring only platform and `goodsTotal`, normalize nulls, and calculate the three derived values.
- [ ] **Step 4: Run** the focused test and confirm pass.
- [ ] **Step 5: Commit** the contract change.

### Task 2: Persist collection delivery fee and flexible confirmed data

**Files:**
- Create: `migrations/0004_flexible_order_recognition.sql`
- Modify: `src/lib/bd-collection.ts`
- Modify: `src/lib/collection-recognition.ts`
- Modify: `tests/unit/bd-collection.test.ts`
- Modify: `tests/unit/collection-recognition.test.ts`

**Interfaces:**
- `CreateCollectionInput` gains `originalDeliveryFee: number`.
- `confirmCollection` writes `ConfirmedOrderV1` with nullable screenshot fields and required `goodsTotal`.

- [ ] **Step 1: Write failing tests** for persisted delivery fee and null-preserving confirmation rows.
- [ ] **Step 2: Run focused tests** and confirm failure.
- [ ] **Step 3: Implement** additive migration and D1 writes; do not alter or delete existing `ConfirmedOrder`.
- [ ] **Step 4: Run focused tests** and confirm pass.
- [ ] **Step 5: Apply migration to remote D1 and verify a test read/write.**

### Task 3: BD input and recognition-confirmation UI

**Files:**
- Modify: `src/app/collect/page.tsx`
- Modify: `src/app/collect/[id]/page.tsx`
- Modify: `src/app/api/uploads/route.ts`
- Modify: `src/app/globals.css`
- Modify: `tests/unit/bd-collection-page.test.ts`
- Modify: `tests/unit/p0-3-route-exports.test.ts`

**Interfaces:**
- Upload form submits `originalDeliveryFee`.
- Confirmation page renders nullable values as “未识别” and labels derived values as system-calculated.

- [ ] **Step 1: Write failing UI/API tests** for delivery-fee input and nullable result rendering.
- [ ] **Step 2: Run focused tests** and confirm failure.
- [ ] **Step 3: Implement** form input, API parsing, and editable result display.
- [ ] **Step 4: Run focused tests** and confirm pass.
- [ ] **Step 5: Commit** the BD workflow change.

### Task 4: Real image verification and release

**Files:**
- Modify only if validation exposes a defect.

- [ ] **Step 1: Run full automated suite** with `pnpm test`.
- [ ] **Step 2: Build** with `pnpm exec opennextjs-cloudflare build` under WSL.
- [ ] **Step 3: Deploy** to the existing Worker.
- [ ] **Step 4: Upload `测试图/美.jpg` and `测试图/淘.jpg` through the BD page, with a delivery fee entered.**
- [ ] **Step 5: Verify** D1 contains two flexible result rows and that a second upload of the same files is rejected.
- [ ] **Step 6: Commit and push** the release.
