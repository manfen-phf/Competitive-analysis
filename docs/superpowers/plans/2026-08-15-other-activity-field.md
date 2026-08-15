# Other Activity Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture merchant-funded non-red-packet, non-delivery promotions as an independent `otherActivityAmount` field for recognized orders.

**Architecture:** Keep `merchantActivityAmount` as the screenshot's total merchant-funded activity amount, so the existing user-paid formula remains correct. Add nullable `otherActivityAmount` only as a component breakdown, persist it in `ConfirmedOrderV1`, and include precise B家 shop-full-reduction instructions in the Qwen prompt.

**Tech Stack:** Next.js/React, TypeScript, Vitest, Cloudflare D1, Cloudflare Workers, Qwen compatible API.

## Global Constraints

- V1 uses Cloudflare D1 for structured data and Cloudflare R2 for image objects.
- Do not change existing collection pairing, deduplication, or user-paid calculation.
- `goodsTotal` remains the only mandatory model-extracted monetary field.
- All new screenshot-only fields are nullable and must never be guessed.

---

### Task 1: Add the field to recognition validation and Qwen contract

**Files:**
- Modify: `src/lib/validation.ts`
- Modify: `src/lib/recognition-provider.ts`
- Test: `tests/unit/flexible-recognition.test.ts`
- Test: `tests/unit/recognition-provider.test.ts`

**Interfaces:**
- Produces: `RecognitionRawResult.otherActivityAmount: number | null`.

- [ ] **Step 1: Write failing tests**

```ts
expect(normalizeRecognitionResult({ platform: "B_JIA", goodsTotal: 67.8, otherActivityAmount: 3 }, 0).otherActivityAmount).toBe(3);
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm vitest run tests/unit/flexible-recognition.test.ts tests/unit/recognition-provider.test.ts`

- [ ] **Step 3: Implement the field and B家 mapping instructions**

```ts
otherActivityAmount: nullableMoney,
```

Add prompt guidance that B家 `店铺满减` belongs to this field and the total `商家承担活动款` remains `merchantActivityAmount`.

- [ ] **Step 4: Run focused tests**

Run: `pnpm vitest run tests/unit/flexible-recognition.test.ts tests/unit/recognition-provider.test.ts`

### Task 2: Persist and show the field in the confirmation flow

**Files:**
- Create: `migrations/0005_other_activity_amount.sql`
- Modify: `src/lib/collection-recognition.ts`
- Modify: `src/app/collect/[id]/page.tsx`
- Test: `tests/unit/collection-recognition.test.ts`

**Interfaces:**
- Consumes: `RecognitionRawResult.otherActivityAmount`.
- Produces: `ConfirmedOrderV1.otherActivityAmount` and an editable `其他活动（如店铺满减）` input.

- [ ] **Step 1: Write failing persistence test**

```ts
expect(writes[0].sql).toContain('"otherActivityAmount"');
expect(writes[0].values).toContain(3);
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm vitest run tests/unit/collection-recognition.test.ts`

- [ ] **Step 3: Implement migration, SQL persistence, and editable UI field**

```sql
ALTER TABLE "ConfirmedOrderV1" ADD COLUMN "otherActivityAmount" REAL;
```

Insert and upsert this nullable column with every confirmed result; label it as `其他活动（如店铺满减）` in the BD review page.

- [ ] **Step 4: Run focused test**

Run: `pnpm vitest run tests/unit/collection-recognition.test.ts`

### Task 3: Verify and deploy

**Files:**
- Modify: plan checkboxes in this file.

- [ ] **Step 1: Run all unit tests**

Run: `pnpm test`

- [ ] **Step 2: Run production worker build**

Run: `pnpm exec opennextjs-cloudflare build`

- [ ] **Step 3: Apply migration to the production D1 database and verify its column**

Run: `pnpm exec wrangler d1 migrations apply gx-food-delivery-competition-db --remote`

- [ ] **Step 4: Deploy and verify the public Worker route**

Run: `pnpm exec wrangler deploy`

- [ ] **Step 5: Commit only source, migration, tests, and plan files, then push `v1-core`**

```bash
git add src migrations tests docs
git commit -m "feat: add other activity promotion field"
git push origin v1-core
```
