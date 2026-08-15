# 管理端运营工作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让管理员通过真实 D1 数据在首页、洞察、统计和识别记录中心完成外卖竞对采集运营管理。

**Architecture:** 在服务端新增只读的运营聚合查询层，统一把 `CollectionSession`、`UploadImage`、`RecognitionResult`、已上线的 `ConfirmedOrderV1`、`Merchant`、`City` 和 BD 用户映射为管理端 DTO。查询直接使用 Cloudflare D1；API 路由只负责解析筛选参数和返回 JSON；页面只读取 DTO，不直接组合底层业务表。工作台壳、首页、洞察、统计和记录页共用轻量组件与 CSS tokens，保持现有 BD 采集和确认路由不变。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Prisma D1 adapter、Cloudflare D1/R2、Vitest、OpenNext/Cloudflare Workers。

## Global Constraints

- 保持 Cloudflare D1 为唯一结构化数据源、R2 为原图存储；不得新增 PostgreSQL、CloudBase、Agnes 或其他云平台。
- 仅已人工确认的 `ConfirmedOrder` 进入竞对金额分析；上传/识别/确认过程指标分别统计。
- 图片不写入 D1；记录页只经现有受控图片读取路由访问 R2 原图。
- 不展示或筛选订单号；历史字段仅作兼容保留。
- 实付配送费沿用 `max(原价配送费 - 减配送费, 0)`。
- 桌面端和 390px 手机端均须可用；不引入新的大型 UI/图表依赖。
- 每个任务先写失败测试、再做最小实现、运行对应测试后提交；不得把 P0 占位响应当作完成。

---

### Task 1: 管理端运营聚合查询层

**Files:**
- Create: `src/lib/management-analytics.ts`
- Modify: `src/lib/analytics.ts`
- Test: `tests/unit/management-analytics.test.ts`

**Interfaces:**
- Consumes: `D1Database` from the Cloudflare request context and the confirmed-order V1 relations.
- Produces: `getManagementOverview(filters)`, `getManagementInsights(filters)`, `getCollectionStatistics(filters)`, `getManagementRecords(filters)`.
- Produces types: `ManagementFilters`, `ManagementOverview`, `ManagementInsights`, `CollectionStatistics`, `ManagementRecord`.

- [ ] **Step 1: Write failing tests for aggregation boundaries**

```ts
it("does not include unconfirmed images in price comparison", async () => {
  const result = await getManagementInsights({}, prisma);
  expect(result.platforms.MEITUAN.validOrderCount).toBe(1);
});

it("counts a collection as paired only when both platforms are confirmed", async () => {
  const result = await getCollectionStatistics({}, prisma);
  expect(result.pairedCollectionCount).toBe(1);
});

it("groups statistics by city and BD without inventing labels", async () => {
  const result = await getCollectionStatistics({}, prisma);
  expect(result.byCity[0]).toMatchObject({ label: "玉林市" });
  expect(result.byBd[0]).toMatchObject({ label: "李明" });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm vitest run tests/unit/management-analytics.test.ts`

Expected: FAIL because the module and exported aggregation functions do not exist.

- [ ] **Step 3: Implement normalized filter parsing and D1 query mapping**

```ts
export type ManagementFilters = {
  start?: Date;
  end?: Date;
  city?: string;
  bdName?: string;
  merchantId?: string;
  platform?: "MEITUAN" | "B_JIA";
  status?: "UPLOADED" | "RECOGNIZED" | "CONFIRMED" | "FAILED";
};

export async function getManagementOverview(filters: ManagementFilters, db: D1Database) {
  // Query ConfirmedOrderV1 with merchant/city/BD relations and image recognition status.
  // Derive all headline counts and top comparable merchant gaps from these rows.
}
```

Use parameterized D1 statements per independent dataset with `Promise.all`; map raw rows to plain DTOs before returning. Include `otherActivityAmount` in metric DTOs and never emit `orderNumber`.

- [ ] **Step 4: Extend pure analytics helpers where needed**

```ts
export function collectionCompletionSummary(rows: CollectionStateRow[]) {
  return {
    uploadedImageCount: rows.filter((row) => row.imageId).length,
    recognizedImageCount: rows.filter((row) => row.recognitionStatus === "SUCCESS").length,
    confirmedImageCount: rows.filter((row) => row.confirmed).length,
    failedImageCount: rows.filter((row) => row.recognitionStatus === "FAILED").length,
  };
}
```

Keep calculations pure and covered by tests so D1 data mapping does not duplicate financial or completion rules.

- [ ] **Step 5: Run focused and full tests**

Run: `pnpm vitest run tests/unit/management-analytics.test.ts tests/unit/analytics.test.ts`

Expected: PASS with every state category and all selected metric fields asserted.

- [ ] **Step 6: Commit**

```bash
git add src/lib/management-analytics.ts src/lib/analytics.ts tests/unit/management-analytics.test.ts
git commit -m "feat: add management analytics aggregation"
```

### Task 2: 重新启用管理端数据 API

**Files:**
- Modify: `src/app/api/analytics/route.ts`
- Modify: `src/app/api/health/route.ts`
- Modify: `src/app/api/records/route.ts`
- Modify: `src/app/api/filter-options/route.ts`
- Modify: `src/app/api/merchants/route.ts`
- Create: `src/app/api/management/overview/route.ts`
- Create: `src/app/api/management/statistics/route.ts`
- Test: `tests/unit/management-api.test.ts`

**Interfaces:**
- Consumes: `ManagementFilters` and aggregation functions from Task 1.
- Produces: JSON endpoints `/api/management/overview`, `/api/analytics`, `/api/management/statistics`, `/api/records`, `/api/filter-options`, `/api/merchants`.
- Query parameters: `start`, `end`, `city`, `bdName`, `merchantId`, `platform`, `status`.

- [ ] **Step 1: Write failing route tests**

```ts
it("returns real analytics rather than the P0 unavailable response", async () => {
  const response = await GET(new Request("http://test/api/analytics?city=玉林市"));
  expect(response.status).toBe(200);
  expect((await response.json()).platforms.MEITUAN).toBeDefined();
});

it("rejects an invalid platform filter", async () => {
  const response = await GET(new Request("http://test/api/records?platform=OTHER"));
  expect(response.status).toBe(400);
});
```

- [ ] **Step 2: Run the focused route test to verify it fails**

Run: `pnpm vitest run tests/unit/management-api.test.ts`

Expected: FAIL because routes currently return `p0Unavailable`.

- [ ] **Step 3: Add one shared query parser**

```ts
export function parseManagementFilters(url: URL): ManagementFilters {
  // Accept optional ISO start/end dates, city, bdName, merchantId, platform and status.
  // Throw a typed validation error for malformed date, platform or status values.
}
```

Put the parser in `src/lib/management-analytics.ts` or a small adjacent module. All management routes use it; no route hand-rolls a divergent filter interpretation.

- [ ] **Step 4: Implement endpoint behaviors**

```ts
// /api/management/overview: ManagementOverview
// /api/analytics: ManagementInsights
// /api/management/statistics: CollectionStatistics
// /api/records: { records: ManagementRecord[] }
// /api/filter-options: { cities: string[]; bdNames: string[] }
// /api/merchants: { merchants: MerchantOption[] }
```

For records, construct image access URLs as `/api/uploads/{imageId}/image`; do not return R2 keys. Return 400 for invalid filters, 200 with zero-value arrays for valid but empty datasets, and 500 with a generic error message for unexpected failures.

- [ ] **Step 5: Run focused and existing API tests**

Run: `pnpm vitest run tests/unit/management-api.test.ts tests/unit/next-route-exports.test.ts tests/unit/p0-3-route-exports.test.ts`

Expected: PASS; no management route imports `p0-gate`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api src/lib/management-analytics.ts tests/unit/management-api.test.ts
git commit -m "feat: expose management workspace APIs"
```

### Task 3: 工作台壳与真实首页驾驶舱

**Files:**
- Modify: `src/components/workspace/workspace-shell.tsx`
- Create: `src/components/management/overview-client.tsx`
- Create: `src/components/management/metric-card.tsx`
- Create: `src/components/management/status-list.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/unit/management-home-page.test.ts`

**Interfaces:**
- Consumes: `/api/management/overview` JSON and `ManagementOverview` type.
- Produces: desktop rail/right collaboration panel; responsive central overview content.

- [ ] **Step 1: Write failing component tests**

```ts
it("renders an explicit empty state when no confirmed orders exist", () => {
  expect(renderOverview(emptyOverview)).toContain("上传首组双平台订单");
});

it("renders real pending-confirmation and paired-coverage counts", () => {
  expect(renderOverview(populatedOverview)).toContain("待确认");
  expect(renderOverview(populatedOverview)).toContain("双平台覆盖");
});
```

- [ ] **Step 2: Run the page test to verify it fails**

Run: `pnpm vitest run tests/unit/management-home-page.test.ts`

Expected: FAIL because the overview client components do not exist.

- [ ] **Step 3: Implement the homepage view model and loading behavior**

```tsx
const [state, setState] = useState<LoadState<ManagementOverview>>({ kind: "loading" });

useEffect(() => {
  fetch("/api/management/overview")
    .then(readJson)
    .then((data) => setState({ kind: "ready", data }))
    .catch(() => setState({ kind: "error" }));
}, []);
```

Render four summary signals (paired coverage, pending confirmation, recognition failures, today uploads), top merchant gaps, city capture status and three direct actions. Do not show fixed city names or example amounts.

- [ ] **Step 4: Upgrade shell and CSS without changing BD collection semantics**

Implement selected navigation state, a search/command affordance, desktop context strip, right-side operations prompt list, skeleton states, focus styles and mobile bottom navigation. Use CSS variables and existing color tokens; use thin borders and translucent panels rather than dense boxed tables. Use `@media (max-width: 700px)` to make controls full-width and hide the desktop rail.

- [ ] **Step 5: Run UI tests and visual local check**

Run: `pnpm vitest run tests/unit/management-home-page.test.ts tests/unit/workspace-copy.test.ts`

Then run: `pnpm dev`

Verify in browser at desktop width and 390px width: navigation works, homepage shows real loading/empty/ready states, action links point to existing routes, and no horizontal viewport overflow exists.

- [ ] **Step 6: Commit**

```bash
git add src/components/workspace src/components/management src/app/page.tsx src/app/globals.css tests/unit/management-home-page.test.ts
git commit -m "feat: build management operations home"
```

### Task 4: 数据洞察、采集统计与识别记录中心

**Files:**
- Create: `src/components/management/filter-bar.tsx`
- Create: `src/components/management/platform-comparison.tsx`
- Create: `src/components/management/statistics-grid.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/health/page.tsx`
- Modify: `src/app/records/page.tsx`
- Modify: `src/app/stat/page.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/unit/management-pages.test.ts`

**Interfaces:**
- Consumes: Task 2 API endpoints and shared query parameters.
- Produces: `/dashboard` insight page, `/stat` collection statistics page, `/records` administrator record page.

- [ ] **Step 1: Write failing page tests**

```ts
it("keeps city, BD, merchant and date filters in the analytics request", () => {
  expect(buildManagementQuery({ city: "玉林市", bdName: "李明" })).toContain("bdName=");
});

it("does not render order number in management records", () => {
  expect(recordsPageSource).not.toContain("订单号");
});

it("labels a one-platform collection as pending completion", () => {
  expect(renderStatistics(onePlatformStats)).toContain("待补齐");
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `pnpm vitest run tests/unit/management-pages.test.ts`

Expected: FAIL because shared filter controls and management page content do not exist.

- [ ] **Step 3: Implement reusable filter bar and data loading**

```ts
export type FilterState = {
  start: string;
  end: string;
  city: string;
  bdName: string;
  merchantId: string;
  platform: "" | "MEITUAN" | "B_JIA";
};

export function toSearchParams(filters: FilterState) {
  return new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
}
```

Fetch filter options once per page load, defer text-search filtering with `useDeferredValue`, and ensure any page error preserves the filter controls so the user can retry or change scope.

- [ ] **Step 4: Implement insight page**

Render real average metric comparison cards, platform difference explanation, a compact CSS/SVG trend visualization from API trend data, merchant ranking and city/BD breakdown. Clearly label all amount cards as “平均每单” and rate as percent. Empty datasets must direct users to the collection page.

- [ ] **Step 5: Implement statistics page**

Render real upload, recognition, confirmation, failure and paired-collection metrics. Provide city and BD cards/tables with completion percentage. A collection with only one confirmed platform must read “待补齐双平台”, not “完成”.

- [ ] **Step 6: Implement records page**

Render filterable newest-first record list with platform/status badges, city/BD/merchant context, source image preview and core recognized values. Retain R2 image display behind existing image API and remove every visible order-number field.

- [ ] **Step 7: Run focused tests and browser responsive QA**

Run: `pnpm vitest run tests/unit/management-pages.test.ts tests/unit/record-list.test.ts tests/unit/analytics.test.ts`

Verify locally at desktop and 390px: filters work, records expand, source image loads when present, and tables transform to readable card/scroll layouts instead of clipping.

- [ ] **Step 8: Commit**

```bash
git add src/components/management src/app/dashboard/page.tsx src/app/health/page.tsx src/app/records/page.tsx src/app/stat/page.tsx src/app/globals.css tests/unit/management-pages.test.ts
git commit -m "feat: add management insights and collection statistics"
```

### Task 5: 全链路验证与 Cloudflare 发布

**Files:**
- Modify: `README.md` (only if user-facing validation route or management navigation changes)
- Test: existing `tests/unit/*.test.ts`

**Interfaces:**
- Consumes: all prior task APIs and current Cloudflare bindings in `wrangler.jsonc`.
- Produces: a deployed Worker version whose management screens query real D1 and display R2 image previews.

- [ ] **Step 1: Run complete regression suite**

Run: `pnpm test`

Expected: 0 failing tests, including historical P0-1/P0-2/P0-3 tests and new management tests.

- [ ] **Step 2: Run production build**

Run from WSL copy: `pnpm exec opennextjs-cloudflare build`

Expected: exit code 0 and `.open-next/worker.js` exists.

- [ ] **Step 3: Verify D1 and R2 runtime access before deploy**

Run: `pnpm exec wrangler d1 execute gx-food-delivery-competition-db --remote --command "SELECT COUNT(*) AS total FROM ConfirmedOrder"`

Run: `pnpm exec wrangler r2 object get gx-food-delivery-competition-images --help`

Expected: D1 returns a count and Wrangler is authenticated for the existing R2 binding; do not write or delete production business records during this check.

- [ ] **Step 4: Deploy and validate live routes**

Run: `pnpm exec wrangler deploy`

Then check with authenticated/normal browser requests:

```text
GET /api/management/overview -> 200 JSON, no P0 unavailable text
GET /api/analytics -> 200 JSON, no P0 unavailable text
GET /api/management/statistics -> 200 JSON
GET /api/records -> 200 JSON
GET / -> renders operation workspace
GET /dashboard -> renders insight screen
GET /stat -> renders statistics screen
GET /records -> renders record center
```

- [ ] **Step 5: Mobile visual verification**

At 390px viewport, confirm bottom navigation is visible; collection page retains merchant selection, original delivery fee and two upload slots; record image and filters remain usable; no horizontal page overflow.

- [ ] **Step 6: Commit documentation if changed and push**

```bash
git add README.md
git commit -m "docs: document management workspace validation"
git push origin v1-core
```

Only create this documentation commit if `README.md` changed. Push all prior commits regardless.
