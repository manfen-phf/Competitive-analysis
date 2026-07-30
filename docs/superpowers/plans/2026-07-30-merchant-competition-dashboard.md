# 商家维度外卖竞争态势分析工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a locally runnable internal Web tool that imports merchant/BD data, strictly recognizes order screenshots, and compares Meituan vs B家 price competitiveness by merchant, BD, city, and date.

**Architecture:** Use a Next.js App Router application with server routes. SQLite persists master-data versions, merchant assignments, uploaded images, recognition attempts, validated orders, and analytics queries; local disk stores source images. A single OCR adapter calls OpenAI's image-capable Responses API and returns a typed JSON result; server-side validators decide whether an upload can enter the reporting dataset.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Prisma + SQLite, Zod, XLSX, Vitest, Playwright, OpenAI JavaScript SDK, Recharts.

## Global Constraints

- No ordinary user login; protect only the master-data import route with an administrator passcode in `ADMIN_IMPORT_PASSCODE`.
- Uploading users manually select city and merchant only; platform comes from the image and BD comes from the merchant assignment effective on upload date.
- Use upload time in Asia/Shanghai for all reporting dates; do not use order timestamps in screenshots for report filtering.
- Platform values are exactly `MEITUAN` and `B_JIA`; display `B家`, never “饿了么”.
- Required fields are: dishPrice, packagingFee, platformRedPacket, originalDeliveryFee, deliveryFeeReduction, paidDeliveryFee, merchantSettlementAmount, userPaidAmount, otherPromotion, technicalServiceFee, deliveryServiceFee, merchantRate.
- Missing, non-numeric, low-confidence, duplicate, or failed mathematical validation records must not enter analytics. No manual correction UI.
- Week W1 starts on January 1 and ends on that week's Sunday; later weeks run Monday-Sunday within the same year.
- All dashboard amount metrics are average per validated screenshot/order; always show the valid order count.
- Build source, tests, and data fixtures in UTF-8.

---

## File Structure

- `package.json`, `next.config.ts`, `tailwind.config.ts`, `vitest.config.ts`: application, test, and styling configuration.
- `prisma/schema.prisma`: SQLite schema and constraints.
- `src/lib/time.ts`: Asia/Shanghai date keys and custom W1 week calculations.
- `src/lib/validation.ts`: typed OCR payload validation and financial consistency checks.
- `src/lib/dedup.ts`: image SHA-256 and order-number duplicate checks.
- `src/lib/master-data.ts`: Excel parsing, atomic master-data versioning, city/merchant search, and BD lookup.
- `src/lib/ocr.ts`: structured image-recognition adapter and confidence normalization.
- `src/lib/analytics.ts`: scoped averages, price differences, rankings, and health summaries.
- `src/app/api/.../route.ts`: upload, master-data import, merchant lookup, analytics, and health API boundaries.
- `src/app/(public)/...`: upload, dashboard, and health pages without login.
- `src/app/admin/import/page.tsx`: passcode-gated master-data import page.
- `tests/unit/*.test.ts`: deterministic unit tests for time, validation, dedup, master-data, and analytics.
- `tests/e2e/*.spec.ts`: browser smoke tests for the public flow and import protection.

### Task 1: Scaffold the local application and persistence layer

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`
- Create: `prisma/schema.prisma`, `.env.example`, `src/lib/db.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Test: `tests/unit/db-schema.test.ts`

**Interfaces:**
- Produces Prisma models `MasterDataVersion`, `MerchantAssignment`, `Upload`, `OrderRecord`, and `RecognitionFailure` for later tasks.

- [ ] **Step 1: Write the failing schema smoke test**

```ts
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

it("connects to the local SQLite database", async () => {
  await expect(prisma.$queryRaw`SELECT 1`).resolves.toBeTruthy();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/unit/db-schema.test.ts`

Expected: FAIL because the project and database client do not exist.

- [ ] **Step 3: Create the minimal application and Prisma schema**

```prisma
model MerchantAssignment {
  id        String   @id @default(cuid())
  merchantId String
  merchantName String
  city      String
  bdName    String
  effectiveFrom DateTime
  effectiveTo DateTime?
  versionId String
  @@index([city, merchantId])
  @@index([merchantId, effectiveFrom])
}
```

Include unique image hashes and optional unique order numbers on `OrderRecord`; add foreign keys from successful orders and failures to `Upload`.

- [ ] **Step 4: Run migrations and the test**

Run: `npx prisma migrate dev --name initial && npm run test -- tests/unit/db-schema.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json prisma src tests .env.example
git commit -m "feat: scaffold merchant competition application"
```

### Task 2: Implement time rules and financial validation

**Files:**
- Create: `src/lib/time.ts`, `src/lib/validation.ts`, `src/lib/types.ts`
- Test: `tests/unit/time.test.ts`, `tests/unit/validation.test.ts`

**Interfaces:**
- Produces `getReportPeriod(uploadedAt: Date): ReportPeriod`.
- Produces `validateRecognition(payload: RecognitionPayload): ValidationResult`.

- [ ] **Step 1: Write failing time and validation tests**

```ts
expect(getReportPeriod(new Date("2026-01-03T12:00:00+08:00")).weekKey).toBe("2026-W1");
expect(getReportPeriod(new Date("2026-01-05T12:00:00+08:00")).weekKey).toBe("2026-W2");
expect(validateRecognition(validPayload).ok).toBe(true);
expect(validateRecognition({ ...validPayload, userPaidAmount: null }).ok).toBe(false);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/time.test.ts tests/unit/validation.test.ts`

Expected: FAIL because the period and validation functions do not exist.

- [ ] **Step 3: Implement strict typed validation**

```ts
export const recognitionSchema = z.object({
  platform: z.enum(["MEITUAN", "B_JIA"]),
  orderNumber: z.string().min(1),
  dishPrice: z.number().nonnegative(),
  packagingFee: z.number().nonnegative(),
  platformRedPacket: z.number().nonnegative(),
  originalDeliveryFee: z.number().nonnegative(),
  deliveryFeeReduction: z.number().nonnegative(),
  paidDeliveryFee: z.number().nonnegative(),
  merchantSettlementAmount: z.number(),
  userPaidAmount: z.number().nonnegative(),
  otherPromotion: z.number().nonnegative(),
  technicalServiceFee: z.number().nonnegative(),
  deliveryServiceFee: z.number().nonnegative(),
  merchantRate: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
});
```

Reject confidence below the configured threshold; require `originalDeliveryFee - deliveryFeeReduction ≈ paidDeliveryFee`; apply an explicit tolerance of `0.02` yuan to money comparisons.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/unit/time.test.ts tests/unit/validation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib tests/unit
git commit -m "feat: add reporting time and strict recognition validation"
```

### Task 3: Build versioned master-data import and merchant lookup

**Files:**
- Create: `src/lib/master-data.ts`, `src/app/api/admin/master-data/route.ts`, `src/app/api/merchants/route.ts`
- Create: `src/app/admin/import/page.tsx`, `src/components/MasterDataImportForm.tsx`
- Test: `tests/unit/master-data.test.ts`, `tests/e2e/admin-import.spec.ts`

**Interfaces:**
- Consumes: uploaded `.xlsx` file and `ADMIN_IMPORT_PASSCODE`.
- Produces: `importMasterData(file: Buffer): ImportPreview` and `findMerchants(city: string, query: string): MerchantOption[]`.

- [ ] **Step 1: Write failing master-data tests**

```ts
expect(await importMasterData(validWorkbook)).toMatchObject({ valid: true, added: 2 });
expect(await importMasterData(workbookMissingCity)).toMatchObject({ valid: false });
expect(await findBdForMerchant("M-001", uploadDate)).toBe("李娜");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/master-data.test.ts`

Expected: FAIL because the import and BD resolution functions do not exist.

- [ ] **Step 3: Implement atomic import and protected route**

```ts
await prisma.$transaction(async (tx) => {
  const version = await tx.masterDataVersion.create({ data: { sourceName, importedAt: new Date() } });
  await tx.merchantAssignment.createMany({ data: parsedRows.map(row => ({ ...row, versionId: version.id })) });
});
```

Verify the passcode before parsing; return a preview before the confirm write. Query merchants by city plus case-insensitive ID/name search, and resolve BD from the assignment effective at upload time.

- [ ] **Step 4: Run unit and browser tests**

Run: `npm run test -- tests/unit/master-data.test.ts && npx playwright test tests/e2e/admin-import.spec.ts`

Expected: PASS; incorrect passcode cannot import, invalid Excel cannot replace current data.

- [ ] **Step 5: Commit**

```bash
git add src/lib/master-data.ts src/app/api src/app/admin src/components tests
git commit -m "feat: add protected versioned merchant data import"
```

### Task 4: Integrate image recognition and strict upload ingestion

**Files:**
- Create: `src/lib/ocr.ts`, `src/lib/dedup.ts`, `src/lib/upload-service.ts`
- Create: `src/app/api/uploads/route.ts`, `src/app/upload/page.tsx`, `src/components/OrderUploadForm.tsx`
- Test: `tests/unit/upload-service.test.ts`, `tests/e2e/upload.spec.ts`

**Interfaces:**
- Consumes: selected `city`, `merchantId`, image file, and server secret `OPENAI_API_KEY`.
- Produces: `ingestScreenshot(input): Promise<UploadOutcome>` where outcome is either `{status:"SUCCESS", orderId}` or `{status:"FAILED", reason}`.

- [ ] **Step 1: Write failing upload-service tests with a fake OCR adapter**

```ts
const result = await ingestScreenshot({ city: "玉林市", merchantId: "M-001", file: validPng, ocr: fakeValidOcr });
expect(result.status).toBe("SUCCESS");
expect((await ingestScreenshot({ city: "玉林市", merchantId: "M-001", file: missingFieldPng, ocr: fakeMissingFieldOcr })).status).toBe("FAILED");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/upload-service.test.ts`

Expected: FAIL because ingestScreenshot does not exist.

- [ ] **Step 3: Implement adapter, hashing, and persistence boundary**

```ts
export interface OcrAdapter {
  recognize(image: Buffer): Promise<RecognitionPayload>;
}

const hash = createHash("sha256").update(fileBuffer).digest("hex");
const duplicate = await prisma.orderRecord.findFirst({ where: { OR: [{ imageHash: hash }, { orderNumber: result.orderNumber }] } });
```

Use the OpenAI adapter only on the server, request JSON matching `recognitionSchema`, save the source image before recognition, and persist a `RecognitionFailure` with a user-readable reason for every reject. Do not create an `OrderRecord` before validation and duplicate checks pass.

- [ ] **Step 4: Run unit and end-to-end tests**

Run: `npm run test -- tests/unit/upload-service.test.ts && npx playwright test tests/e2e/upload.spec.ts`

Expected: PASS; city-restricted merchant selection works, valid image succeeds, missing field and duplicate image fail, and no edit controls exist.

- [ ] **Step 5: Commit**

```bash
git add src/lib src/app/api/uploads src/app/upload src/components tests
git commit -m "feat: add strict screenshot recognition ingestion"
```

### Task 5: Implement analytics queries and the price-competitiveness dashboard

**Files:**
- Create: `src/lib/analytics.ts`, `src/app/api/analytics/route.ts`
- Create: `src/app/dashboard/page.tsx`, `src/components/DateRangePicker.tsx`, `src/components/CompetitionDashboard.tsx`, `src/components/PriceCompositionChart.tsx`, `src/components/MerchantRankingTable.tsx`
- Test: `tests/unit/analytics.test.ts`, `tests/unit/time.test.ts`, `tests/e2e/dashboard.spec.ts`

**Interfaces:**
- Consumes: `AnalyticsFilters { granularity, startDate, endDate, city?, bdName?, merchantId? }`.
- Produces: `CompetitionDashboardData` with platform averages, counts, composition series, and merchant rankings.

- [ ] **Step 1: Write failing analytics tests**

```ts
const data = await getCompetitionDashboard({ granularity: "WEEK", startDate, endDate, merchantId: "M-001" });
expect(data.platforms.MEITUAN.userPaidAmount.average).toBe(31.5);
expect(data.platforms.MEITUAN.validOrderCount).toBe(2);
expect(data.rankings[0].advantagedPlatform).toBe("B_JIA");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/analytics.test.ts`

Expected: FAIL because dashboard query functions do not exist.

- [ ] **Step 3: Implement scoped averages and UI**

```ts
const averages = await prisma.orderRecord.groupBy({
  by: ["platform"],
  where: scopedValidatedOrderWhere(filters),
  _avg: { userPaidAmount: true, platformRedPacket: true, paidDeliveryFee: true, merchantSettlementAmount: true },
  _count: { id: true },
});
```

Create a date picker with day/week/month/year modes and no quick shortcuts. For week mode, render labels from `getReportPeriod`. Display fixed Meituan/B家 comparison, metric cards, composition chart, ranking table, valid count, city/BD/merchant filters, and a zero-data state.

- [ ] **Step 4: Run unit and browser tests**

Run: `npm run test -- tests/unit/analytics.test.ts tests/unit/time.test.ts && npx playwright test tests/e2e/dashboard.spec.ts`

Expected: PASS; W1/W2 filtering is correct, averages exclude failures, B家 label is used, and filters update rankings.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics.ts src/app/dashboard src/app/api/analytics src/components tests
git commit -m "feat: add merchant price competitiveness dashboard"
```

### Task 6: Add data-health page, sample data, and release verification

**Files:**
- Create: `src/app/health/page.tsx`, `src/app/api/health/route.ts`, `src/lib/health.ts`
- Create: `prisma/seed.ts`, `tests/e2e/health.spec.ts`, `README.md`
- Modify: `package.json`

**Interfaces:**
- Produces `getCollectionHealth(filters): HealthSummary` with valid, failed, duplicate, and merchant coverage counts.

- [ ] **Step 1: Write failing health-summary test**

```ts
const health = await getCollectionHealth({ startDate, endDate, city: "玉林市" });
expect(health).toMatchObject({ validCount: 4, failedCount: 1, duplicateCount: 1, merchantCoverageRate: 0.5 });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- tests/unit/health.test.ts`

Expected: FAIL because the health query does not exist.

- [ ] **Step 3: Implement health summary, fixtures, and operator documentation**

```ts
return {
  validCount,
  failedCount,
  duplicateCount,
  merchantCoverageRate: totalMerchants === 0 ? 0 : coveredMerchants / totalMerchants,
};
```

Seed valid, missing-field, invalid-amount, duplicate-order, and BD-history sample records for both platforms. Document local setup, required environment variables, Excel columns, administrator import process, screenshot field requirements, and test commands.

- [ ] **Step 4: Run full verification**

Run: `npm run lint && npm run test && npx playwright test && npm run build`

Expected: all commands PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/health src/lib/health.ts prisma tests README.md package.json
git commit -m "feat: add collection health and release fixtures"
```

## Plan Self-Review

- Spec coverage: Tasks 1-3 implement data storage, city-restricted merchant selection, BD-history matching, no-login access, and protected master-data import. Task 4 implements image recognition, strict rejection, source-image preservation, and deduplication. Task 5 implements custom date rules and price averages/analysis. Task 6 implements secondary collection health, fixtures, documentation, and release verification.
- Placeholder scan: no deferred implementation language or unassigned interfaces remain; all external values are named environment variables.
- Type consistency: `RecognitionPayload`, `ValidationResult`, `UploadOutcome`, `AnalyticsFilters`, `CompetitionDashboardData`, and `HealthSummary` are introduced before use and remain the contract names throughout this plan.
