# 外卖竞争分析工作台完整版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个可登录、按角色授权的商家订单截图采集、双平台校对、竞争分析与数据管理工作台。

**Architecture:** 保留现有 Next.js App Router、Prisma、订单识别和主数据业务层；新增服务端会话与角色授权层。页面改为“服务端受保护页面 + 客户端交互组件”，所有数据接口通过统一授权上下文过滤。采集任务成为一个商家、一个 BD、一个原价配送费下的双平台图片集合，确认后的单平台订单记录用于分析与数据中心。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Prisma、PostgreSQL（当前运行库）、Vitest、xlsx、现有截图识别服务。

**Spec:** `docs/superpowers/specs/2026-08-22-competition-workspace-design.md`

## Global Constraints

- 不新增任务、聊天、审批、泛化 AI 助手或无关后台功能。
- 仅保留超级管理员、城市管理员、BD 三类账号；超级管理员 2 人，城市管理员 8 人。
- 美团固定为 `#FFC300`，B家固定为 `#2F7DFF`；绿 / 红仅表达结果语义。
- BD 使用“BD 姓名 + 独立初始口令”；BD 只可访问自己负责商家。
- 城市管理员可查看全量城市数据，但只可修改、确认、导出所属城市数据。
- 所有正式授权必须由服务端页面和 API 同时校验，禁止仅隐藏导航项。
- 原价配送费由 BD 在采集任务填写；实付配送费始终为 `max(原价配送费 - 减配送费, 0)`。
- 不把截图 BLOB 写入数据库；沿用现有存储引用字段。
- 每个任务先写失败测试，再写最小实现；只提交本任务涉及的文件。

---

## File structure

| 路径 | 职责 |
|---|---|
| `prisma/schema.prisma` | 用户、会话、采集任务及订单状态的持久化模型 |
| `src/lib/auth.ts` | 密码哈希、会话 cookie、角色和属地授权函数 |
| `src/lib/permissions.ts` | 针对订单、商家、导出的纯权限判断 |
| `src/app/login/page.tsx` | 登录页 |
| `src/app/api/auth/*` | 登录、退出、当前用户、管理员账号管理接口 |
| `src/components/workspace/*` | 角色感知导航、移动端导航、页头、筛选停靠栏和数据状态 |
| `src/components/collection/*` | 采集任务、双平台上传和校对表单 |
| `src/components/analytics/*` | 自定义日期选择、指标卡、趋势、矩阵、排行 |
| `src/components/data-center/*` | 数据质量摘要、明细列表、原图 / 编辑抽屉、导出操作 |
| `src/app/api/collections/*` | 采集任务创建、图片上传、识别、确认接口 |
| `src/app/api/analytics/route.ts` | 根据授权上下文返回分析快照 |
| `src/app/api/orders/*` | 数据中心查询、修改、导出接口 |
| `src/app/api/health/route.ts` | 按角色返回数据质量摘要 |
| `src/lib/analytics.ts` | 指标定义、计算和时间桶规则 |
| `src/lib/order-calculations.ts` | 校对页的只读计算字段 |
| `src/app/globals.css` | 设计令牌、响应式工作台和组件样式 |

## Task 1: 用户、会话与角色授权基础

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260822180000_workspace_auth/migration.sql`
- Create: `src/lib/auth.ts`
- Create: `src/lib/permissions.ts`
- Create: `tests/unit/auth.test.ts`
- Create: `tests/unit/permissions.test.ts`

**Interfaces:**
- Produces `type AppRole = "SUPER_ADMIN" | "CITY_ADMIN" | "BD"`.
- Produces `getSession(): Promise<SessionUser | null>` where `SessionUser = { id: string; username: string; role: AppRole; city: string | null; bdName: string | null }`.
- Produces `canReadOrder(user, order)`, `canMutateOrder(user, order)`, `canExportCity(user, city)`.

- [ ] **Step 1: Write role authorization tests**

```ts
import { describe, expect, it } from "vitest";
import { canExportCity, canMutateOrder, canReadOrder } from "@/lib/permissions";

const cityAdmin = { role: "CITY_ADMIN" as const, city: "玉林", bdName: null };
const otherCityOrder = { city: "南宁", bdName: "李四" };
const ownCityOrder = { city: "玉林", bdName: "张三" };

describe("order permissions", () => {
  it("lets a city admin read all cities but mutate and export only its city", () => {
    expect(canReadOrder(cityAdmin, otherCityOrder)).toBe(true);
    expect(canMutateOrder(cityAdmin, otherCityOrder)).toBe(false);
    expect(canMutateOrder(cityAdmin, ownCityOrder)).toBe(true);
    expect(canExportCity(cityAdmin, "南宁")).toBe(false);
    expect(canExportCity(cityAdmin, "玉林")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the permission test to verify it fails**

Run: `pnpm test tests/unit/permissions.test.ts`

Expected: FAIL because `src/lib/permissions.ts` does not exist.

- [ ] **Step 3: Add database models and migration**

Add an `AppUser` model with unique `username`, `passwordHash`, `role`, optional `city` and optional `bdName`. Add an `AppSession` model with unique `tokenHash`, `userId`, `expiresAt`, `createdAt`, and `user` relation. Include indexes on `role`, `city`, and `expiresAt`.

```prisma
enum AppRole { SUPER_ADMIN CITY_ADMIN BD }

model AppUser {
  id String @id @default(cuid())
  username String @unique
  passwordHash String
  role AppRole
  city String?
  bdName String?
  sessions AppSession[]
  @@index([role, city])
  @@index([bdName])
}

model AppSession {
  id String @id @default(cuid())
  tokenHash String @unique
  userId String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user AppUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([expiresAt])
}
```

Generate an explicit migration with `pnpm prisma migrate dev --name workspace_auth` and commit the generated SQL.

- [ ] **Step 4: Implement password, session and permissions helpers**

Use Node `crypto.scrypt` with random 16-byte salt and timing-safe comparison. Store a random 32-byte session token only in an HTTP-only, `sameSite: "lax"`, `secure` production cookie named `competition_session`; store its SHA-256 hash in `AppSession`.

```ts
export function canMutateOrder(user: SessionUser, order: { city: string; bdName: string }) {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role === "CITY_ADMIN") return user.city === order.city;
  return user.role === "BD" && user.bdName === order.bdName;
}
```

`canReadOrder` returns true for super admin and city admin; BD requires matching `bdName`. `canExportCity` returns true for super admin and for city admin only when `user.city === city`; it returns false for BD.

Add `ensureBootstrapSuperAdmin()` which creates the first super administrator only when the user table is empty. It reads `SUPER_ADMIN_BOOTSTRAP_USERNAME` and `SUPER_ADMIN_BOOTSTRAP_PASSWORD` using the existing runtime-secret mechanism, hashes the password, and performs no action when either setting is absent. The first super administrator uses the account-management screen to create the second super administrator and all city / BD accounts.

- [ ] **Step 5: Run unit tests**

Run: `pnpm test tests/unit/auth.test.ts tests/unit/permissions.test.ts`

Expected: PASS, including password verification, expired-session rejection, city-admin read/mutate/export boundaries, and BD ownership boundaries.

- [ ] **Step 6: Commit Task 1**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/auth.ts src/lib/permissions.ts tests/unit/auth.test.ts tests/unit/permissions.test.ts
git commit -m "feat: add workspace roles and sessions"
```

## Task 2: 登录、账号管理与受保护页面

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/login-form.tsx`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Create: `src/app/api/admin/users/route.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/upload/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/health/page.tsx`
- Modify: `src/app/admin/import/page.tsx`
- Create: `tests/unit/auth-routes.test.ts`

**Interfaces:**
- Consumes `getSession`, `createSession`, `clearSession`, `AppRole` from Task 1.
- Produces `requireWorkspaceUser(allowedRoles?: AppRole[]): Promise<SessionUser>` from `src/lib/auth.ts`.
- Produces `POST /api/auth/login` with `{ username, password }` and `GET /api/auth/me`.

- [ ] **Step 1: Write failing login-route tests**

```ts
it("sets a session cookie for valid BD credentials", async () => {
  const response = await POST(new Request("http://test/api/auth/login", {
    method: "POST", body: JSON.stringify({ username: "张三", password: "initial-pass" }),
  }) as never);
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain("competition_session=");
});
```

Also cover invalid password (`401`), disabled role-mismatched user creation (`400`), and city administrator creation without `city` (`400`).

- [ ] **Step 2: Run route tests to verify failure**

Run: `pnpm test tests/unit/auth-routes.test.ts`

Expected: FAIL because the route modules do not exist.

- [ ] **Step 3: Implement login and account APIs**

`POST /api/auth/login` accepts JSON, looks up `AppUser.username`, verifies the scrypt hash, removes expired sessions, stores a new session, and sets the secure cookie. `POST /api/auth/logout` removes the matching session and expires the cookie. `GET /api/auth/me` returns the safe `SessionUser` object only.

`POST /api/admin/users` is super-admin-only and validates:

```ts
z.object({
  username: z.string().trim().min(1),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "CITY_ADMIN", "BD"]),
  city: z.string().trim().optional(),
  bdName: z.string().trim().optional(),
})
```

Require `city` for `CITY_ADMIN`, `bdName` for `BD`, and prevent BD usernames from differing from their selected BD name.

- [ ] **Step 4: Implement server page guards**

Move client-only page bodies into `*.client.tsx` files. Leave each `page.tsx` as an async server component that calls `requireWorkspaceUser` and uses `redirect("/login?next=...")` for anonymous users.

Use these role sets:

```ts
const ALL = ["SUPER_ADMIN", "CITY_ADMIN", "BD"] as const;
const DATA = ["SUPER_ADMIN", "CITY_ADMIN"] as const;
const MASTER_DATA = ["SUPER_ADMIN"] as const;
```

`/admin/import` requires `MASTER_DATA`; `/health` requires `DATA`; `/`, `/upload`, `/dashboard` require `ALL`.

- [ ] **Step 5: Run login and guard tests**

Run: `pnpm test tests/unit/auth-routes.test.ts tests/unit/auth.test.ts tests/unit/permissions.test.ts`

Expected: PASS.

- [ ] **Step 6: Manually verify direct URL protection**

Run: `pnpm dev`

Open `/admin/import` in a clean browser session; expected redirect to `/login?next=/admin/import`. Log in as BD; expected `/health` and `/admin/import` redirect or return `403`, while `/upload` and `/dashboard` load.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/app/login src/app/api/auth src/app/api/admin/users src/app/'(workspace)' src/app/layout.tsx src/app/page.tsx src/app/upload src/app/dashboard src/app/health src/app/admin/import tests/unit/auth-routes.test.ts
git commit -m "feat: add role based workspace access"
```

## Task 3: 统一工作台骨架、导航与响应式令牌

**Files:**
- Modify: `src/components/workspace/workspace-shell.tsx`
- Modify: `src/components/workspace/workspace-rail.tsx`
- Create: `src/components/workspace/mobile-navigation.tsx`
- Create: `src/components/workspace/page-header.tsx`
- Create: `src/components/workspace/data-state.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/unit/workspace-copy.test.ts`
- Create: `tests/unit/workspace-navigation.test.ts`

**Interfaces:**
- Consumes `SessionUser` from Task 1.
- Produces `<WorkspaceShell user={user}>`, `<PageHeader />`, `<DataState state="loading" | "empty" | "error" />`.

- [ ] **Step 1: Write navigation visibility tests**

```ts
it("shows data and master data only for roles that are allowed", () => {
  expect(navItemsFor({ role: "BD" } as SessionUser).map((item) => item.href)).toEqual(["/", "/upload", "/dashboard"]);
  expect(navItemsFor({ role: "CITY_ADMIN" } as SessionUser).map((item) => item.href)).toContain("/health");
  expect(navItemsFor({ role: "CITY_ADMIN" } as SessionUser).map((item) => item.href)).not.toContain("/admin/import");
});
```

- [ ] **Step 2: Run navigation test to verify failure**

Run: `pnpm test tests/unit/workspace-navigation.test.ts`

Expected: FAIL because `navItemsFor` is not exported.

- [ ] **Step 3: Implement shared shell and role-aware navigation**

Replace local-storage “视角切换” with the authenticated `SessionUser` prop. Export a pure `navItemsFor(user)` function. Use actual accessible SVG navigation icons at 20px and labels at a consistent baseline. Add a mobile bottom navigation that exposes only allowed destinations.

Add `PageHeader` props:

```ts
type PageHeaderProps = {
  eyebrow?: string; title: string; description?: string;
  backHref?: string; actions?: ReactNode;
};
```

Use `DataState` for loading, empty and error panels rather than page-specific text blocks.

- [ ] **Step 4: Replace global visual token conflicts**

In `globals.css`, define one set of tokens for canvas, elevated panel, control, border, text, platform and status colors. Remove duplicate generic `article`, `main`, `table`, and generic `nav` selectors that currently cause pages to inherit accidental styling. Keep each new component’s class names scoped with `workspace-`, `filter-`, `metric-`, `collection-`, or `data-center-` prefixes.

Use these rules:

```css
:root { --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:24px; --space-6:32px; }
.workspace-control { min-height:40px; border-radius:10px; }
.platform-meituan { --platform:#FFC300; }
.platform-bjia { --platform:#2F7DFF; }
```

- [ ] **Step 5: Run workspace tests and visual smoke check**

Run: `pnpm test tests/unit/workspace-copy.test.ts tests/unit/workspace-navigation.test.ts`

Expected: PASS.

At 1440px, 768px, and 390px verify: icon sizes align, header has back path, mobile bottom nav is visible, and no hidden role-only links remain.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/components/workspace src/app/globals.css tests/unit/workspace-copy.test.ts tests/unit/workspace-navigation.test.ts
git commit -m "feat: unify workspace navigation and design tokens"
```

## Task 4: 双平台采集任务与计算规则

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260822183000_collection_task/migration.sql`
- Create: `src/lib/order-calculations.ts`
- Modify: `src/lib/validation.ts`
- Create: `src/lib/collections.ts`
- Create: `tests/unit/order-calculations.test.ts`
- Create: `tests/unit/collections.test.ts`

**Interfaces:**
- Produces `calculateOrderDerivedValues(input)`.
- Produces `CollectionDraft` with `{ merchantId, city, bdName, originalDeliveryFee, images: PlatformImage[] }`.
- Produces `validateCollectionForConfirmation(draft)`.

- [ ] **Step 1: Write calculation tests**

```ts
it("never returns a negative paid delivery fee", () => {
  expect(calculateOrderDerivedValues({ goodsTotal: 25.5, packagingFee: 2, merchantActivity: 5.5, originalDeliveryFee: 5.5, deliveryFeeReduction: 6 })).toMatchObject({
    dishPrice: 23.5, paidDeliveryFee: 0, userPaidAmount: 23.5,
  });
});
```

Also test no packaging fee (`dishPrice === goodsTotal`) and merchant rate (`(technical + delivery) / goodsTotal`).

- [ ] **Step 2: Run calculation test to verify failure**

Run: `pnpm test tests/unit/order-calculations.test.ts`

Expected: FAIL because `src/lib/order-calculations.ts` does not exist.

- [ ] **Step 3: Add collection persistence model**

Add `CollectionTask` and update `Upload` to belong to a collection. A collection stores `merchantId`, `merchantName`, `city`, `bdName`, `originalDeliveryFee`, `createdByUserId`, `status`, timestamps. Each image stores `platform`, `recognitionStatus`, storage reference, hash and optional recognition result. Preserve existing `Upload` / `OrderRecord` records by writing a migration that creates a backfilled single-image collection for each historical upload before enforcing the foreign key.

Use states:

```prisma
enum CollectionStatus { DRAFT UPLOADING RECOGNIZING READY_TO_CONFIRM CONFIRMED FAILED }
enum UploadPlatform { MEITUAN B_JIA }
enum RecognitionStatus { PENDING PROCESSING SUCCEEDED FAILED DUPLICATE }
```

- [ ] **Step 4: Implement pure collection validation**

`validateCollectionForConfirmation` requires one successful image for `MEITUAN` and one successful image for `B_JIA`, and requires `goodsTotal` for both. It returns an object with actionable `fieldErrors` keyed by platform and field.

- [ ] **Step 5: Run collection tests**

Run: `pnpm test tests/unit/order-calculations.test.ts tests/unit/collections.test.ts tests/unit/validation.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/order-calculations.ts src/lib/collections.ts src/lib/validation.ts tests/unit/order-calculations.test.ts tests/unit/collections.test.ts
git commit -m "feat: add paired collection task model"
```

## Task 5: 采集、识别与人工确认界面

**Files:**
- Create: `src/app/api/collections/route.ts`
- Create: `src/app/api/collections/[id]/images/route.ts`
- Create: `src/app/api/collections/[id]/confirm/route.ts`
- Modify: `src/app/api/merchants/route.ts`
- Create: `src/components/collection/collection-wizard.tsx`
- Create: `src/components/collection/platform-upload-card.tsx`
- Create: `src/components/collection/order-review-form.tsx`
- Modify: `src/app/upload/page.tsx`
- Create: `src/app/upload/upload.client.tsx`
- Create: `tests/unit/collection-confirmation.test.ts`

**Interfaces:**
- Consumes `canMutateOrder`, `calculateOrderDerivedValues`, `validateCollectionForConfirmation`.
- Produces `POST /api/collections`, `POST /api/collections/:id/images`, `POST /api/collections/:id/confirm`.

- [ ] **Step 1: Write API confirmation tests**

```ts
it("rejects confirmation unless both platform images are recognized", async () => {
  const response = await confirmCollection({ collectionId: "c1", user: bdUser, images: [{ platform: "MEITUAN", status: "SUCCEEDED" }] });
  expect(response).toMatchObject({ ok: false, error: "请先完成美团和B家两张截图的识别" });
});

it("rejects a BD editing another BD collection", async () => {
  expect(canMutateCollection(bdUser, { bdName: "李四", city: "玉林" })).toBe(false);
});
```

- [ ] **Step 2: Run confirmation tests to verify failure**

Run: `pnpm test tests/unit/collection-confirmation.test.ts`

Expected: FAIL because collection confirmation does not exist.

- [ ] **Step 3: Implement collection API flow**

`POST /api/collections` validates the selected merchant against the caller’s allowed scope, resolves current BD assignment, and persists the original delivery fee. `POST /images` accepts exactly one image and explicit `platform`; it uses existing hash, storage and recognition functions, marks duplicate hashes as `DUPLICATE`, and persists recognition failure reason without losing the collection.

`POST /confirm` accepts editable recognized values for both platforms, recomputes derived values server-side, checks role/city/BD authority, writes two `OrderRecord` rows transactionally, then marks the collection `CONFIRMED`.

- [ ] **Step 4: Implement task-first upload interface**

Build the page as three visible steps:

```tsx
<CollectionWizard steps={["选择商家", "上传双平台截图", "核对并确认"]} activeStep={step} />
<PlatformUploadCard platform="MEITUAN" accent="#FFC300" />
<PlatformUploadCard platform="B_JIA" accent="#2F7DFF" />
```

The merchant section displays city, merchant name, merchant ID, BD and editable original delivery fee. The upload cards show all defined status states. The review form renders editable fields and read-only derived values, with field-level errors and a confirmation summary.

- [ ] **Step 5: Run API tests and manual upload flow**

Run: `pnpm test tests/unit/collection-confirmation.test.ts tests/unit/order-calculations.test.ts tests/unit/storage.test.ts tests/unit/ocr.test.ts`

Expected: PASS.

Manual test: log in as BD; choose an owned merchant; upload the supplied 美团 and B 家 images; change a recognized field; verify `paidDeliveryFee` never goes below zero; confirm; verify two order rows and one confirmed collection in the database.

- [ ] **Step 6: Commit Task 5**

```bash
git add src/app/api/collections src/app/api/merchants/route.ts src/components/collection src/app/upload tests/unit/collection-confirmation.test.ts
git commit -m "feat: add paired screenshot collection flow"
```

## Task 6: 分析控制台、授权查询与自定义筛选器

**Files:**
- Create: `src/components/analytics/filter-dock.tsx`
- Create: `src/components/analytics/date-range-popover.tsx`
- Create: `src/components/analytics/metric-card.tsx`
- Create: `src/components/analytics/trend-chart.tsx`
- Create: `src/components/analytics/comparison-matrix.tsx`
- Create: `src/components/analytics/merchant-ranking.tsx`
- Create: `src/app/dashboard/dashboard.client.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/api/analytics/route.ts`
- Modify: `src/app/api/filter-options/route.ts`
- Modify: `src/app/api/merchants/route.ts`
- Modify: `src/lib/analytics.ts`
- Create: `tests/unit/analytics-permissions.test.ts`
- Modify: `tests/unit/analytics.test.ts`

**Interfaces:**
- Consumes `SessionUser`, `canReadOrder`, `AnalyticsSnapshot`.
- Produces `filterOrdersForUser(user, records)` and `<FilterDock value onChange />`.

- [ ] **Step 1: Write failing analysis authorization and natural-week tests**

```ts
it("limits a BD snapshot to its own name", () => {
  const rows = [record({ bdName: "张三" }), record({ bdName: "李四" })];
  expect(filterOrdersForUser({ role: "BD", bdName: "张三", city: "玉林" }, rows)).toHaveLength(1);
});

it("labels 2026-01-01 through 2026-01-04 as W1", () => {
  expect(periodLabel(new Date("2026-01-04T12:00:00"), "WEEK")).toBe("2026 W1");
});
```

- [ ] **Step 2: Run analysis tests to verify failure**

Run: `pnpm test tests/unit/analytics-permissions.test.ts tests/unit/analytics.test.ts`

Expected: FAIL because the authorization helper is absent or the week label is not exported.

- [ ] **Step 3: Implement server-side analysis scope**

At the API query boundary, super admin and city admin return all orders. BD queries add `bdName: session.bdName` and use active merchant assignment as an additional ownership check. Filter-option and merchant endpoints apply the same scope; a BD cannot request another BD’s name with a handcrafted query string.

- [ ] **Step 4: Implement FilterDock and date picker**

Do not use `<input type="date">` on the dashboard. `DateRangePopover` supplies:

```ts
type Period = "DAY" | "WEEK" | "MONTH" | "YEAR";
type FilterValue = { period: Period; start?: string; end?: string; city?: string; bd?: string; merchantId?: string; metric: MetricKey };
```

Render two-month calendar for day ranges, natural-week rows for week ranges, month tiles and year tiles. On mobile, `FilterDock` opens as a bottom sheet and only applies filters after the user presses “应用筛选”.

- [ ] **Step 5: Compose the analysis page**

Render, in this exact order: `PageHeader`, `FilterDock`, four `MetricCard`s, `TrendChart`, `ComparisonMatrix`, `MerchantRanking`. Matrix row selection sets `metric` in `FilterValue`, which refetches the same snapshot and updates the cards, trend and ranking. Platform chart legend uses `platform-meituan` / `platform-bjia`; positive/negative result styles never reuse platform colors.

- [ ] **Step 6: Run tests and browser checks**

Run: `pnpm test tests/unit/analytics.test.ts tests/unit/analytics-permissions.test.ts tests/unit/demo-data.test.ts`

Expected: PASS.

Browser checks at 1440px, 768px and 390px: set month / city / BD / merchant / metric; remove one condition chip; reset; open the period selector; click a matrix row; verify all three dependent regions update and no native gray browser calendar appears.

- [ ] **Step 7: Commit Task 6**

```bash
git add src/components/analytics src/app/dashboard src/app/api/analytics/route.ts src/app/api/filter-options/route.ts src/app/api/merchants/route.ts src/lib/analytics.ts tests/unit/analytics.test.ts tests/unit/analytics-permissions.test.ts
git commit -m "feat: build authorized competition analysis dashboard"
```

## Task 7: 数据中心、属地编辑和 Excel 导出

**Files:**
- Create: `src/app/api/orders/route.ts`
- Create: `src/app/api/orders/[id]/route.ts`
- Create: `src/app/api/orders/export/route.ts`
- Create: `src/components/data-center/data-quality-summary.tsx`
- Create: `src/components/data-center/orders-table.tsx`
- Create: `src/components/data-center/order-detail-drawer.tsx`
- Create: `src/app/health/health.client.tsx`
- Modify: `src/app/health/page.tsx`
- Modify: `src/app/api/health/route.ts`
- Create: `tests/unit/orders-permissions.test.ts`
- Create: `tests/unit/orders-export.test.ts`

**Interfaces:**
- Consumes `canReadOrder`, `canMutateOrder`, `canExportCity`.
- Produces `GET /api/orders`, `PATCH /api/orders/:id`, `GET /api/orders/export`.

- [ ] **Step 1: Write failing data-center authorization tests**

```ts
it("prevents a city admin exporting another city", async () => {
  const response = await exportOrders({ user: cityAdmin("玉林"), filters: { city: "南宁" } });
  expect(response.status).toBe(403);
});

it("allows a city admin to read but not patch another city order", () => {
  expect(canReadOrder(cityAdmin("玉林"), { city: "南宁", bdName: "小李" })).toBe(true);
  expect(canMutateOrder(cityAdmin("玉林"), { city: "南宁", bdName: "小李" })).toBe(false);
});
```

- [ ] **Step 2: Run data-center tests to verify failure**

Run: `pnpm test tests/unit/orders-permissions.test.ts tests/unit/orders-export.test.ts`

Expected: FAIL because order management routes do not exist.

- [ ] **Step 3: Implement data center APIs**

`GET /api/orders` filters by date, city, BD, merchant, platform and recognition state. It applies `canReadOrder` scope. `PATCH /api/orders/:id` validates editable source fields, recalculates derived values using `calculateOrderDerivedValues`, and rejects unowned mutation with `403`. `GET /api/orders/export` obtains filters, determines allowed export city server-side, returns `403` if city admin asks for a different city, and generates an xlsx workbook containing only allowed rows.

The Excel export columns must be exactly:

```ts
const exportColumns = [
  "采集时间", "城市", "BD", "商家ID", "商家名称", "平台", "商品总价", "菜品原价", "打包费", "商家活动款", "其他活动", "原价配送费", "减配送费", "实付配送费", "平台红包抵扣金额", "平台红包商家承担", "结算金额", "用户实付", "技术服务费", "配送服务费", "实际费率", "识别状态",
];
```

- [ ] **Step 4: Implement data center UI**

The page begins with four `DataQualitySummary` cards. `OrdersTable` defaults newest first and becomes summary cards on mobile. Opening an order uses `OrderDetailDrawer`, which shows original image, editable recognized fields, calculated fields and audit status. Hide edit / export actions when the current role is not allowed; retain server rejection as the real enforcement.

- [ ] **Step 5: Run tests and role matrix manual tests**

Run: `pnpm test tests/unit/orders-permissions.test.ts tests/unit/orders-export.test.ts tests/unit/order-calculations.test.ts`

Expected: PASS.

Manual test matrix:

| User | View 南宁 order | Edit 南宁 order | Export 南宁 |
|---|---:|---:|---:|
| Super admin | yes | yes | yes |
| 玉林 city admin | yes | no | no |
| 南宁 city admin | yes | yes | yes |
| BD | no data-center access | no | no |

- [ ] **Step 6: Commit Task 7**

```bash
git add src/app/api/orders src/components/data-center src/app/health src/app/api/health/route.ts tests/unit/orders-permissions.test.ts tests/unit/orders-export.test.ts
git commit -m "feat: add governed data center and export"
```

## Task 8: 概览页、三端 QA 与交付验证

**Files:**
- Create: `src/components/overview/overview-summary.tsx`
- Create: `src/components/overview/recent-collection-list.tsx`
- Create: `src/components/overview/attention-list.tsx`
- Create: `src/app/api/overview/route.ts`
- Create: `src/app/overview.client.tsx`
- Modify: `src/app/page.tsx`
- Create: `tests/unit/overview.test.ts`
- Modify: `tests/unit/workspace-copy.test.ts`

**Interfaces:**
- Consumes `SessionUser`, `getHealthSnapshot`, `buildAnalyticsSnapshot`.
- Produces `GET /api/overview`.

- [ ] **Step 1: Write failing overview tests**

```ts
it("returns collection counts, confirmation queue and attention merchants", () => {
  expect(buildOverviewSnapshot(records)).toMatchObject({
    capturedOrderCount: expect.any(Number),
    pendingConfirmationCount: expect.any(Number),
    failedRecognitionCount: expect.any(Number),
    attentionMerchants: expect.any(Array),
  });
});
```

- [ ] **Step 2: Run overview test to verify failure**

Run: `pnpm test tests/unit/overview.test.ts`

Expected: FAIL because overview view model does not exist.

- [ ] **Step 3: Implement concise overview**

`GET /api/overview` returns today’s unique merchant count, order count, pending confirmations, recognition failures, latest collections and merchants with largest current user-paid gap. Render only quick actions “继续采集”, “查看待确认”, “进入竞争分析”, recent activity, and attention list. Do not add charts, chat, task or AI panels.

- [ ] **Step 4: Run full automated suite and production build**

Run: `pnpm test`

Expected: PASS.

Run: `pnpm build`

Expected: Next.js compilation and route generation succeed. If Windows cache rename errors recur, stop the development server, remove only `.next` after confirming its resolved workspace path, then retry once and record the result.

- [ ] **Step 5: Execute browser acceptance checks**

Use a clean session for each role and verify:

1. Super admin logs in, creates / resets a city admin and BD account, imports master data, views and exports all cities.
2. City admin sees all city analysis data, cannot alter or export a different city, and can alter / export its own city.
3. BD logs in with BD name + initial password, sees only assigned merchants, completes paired collection and sees only its data in analysis.
4. At 1440px, 768px and 390px inspect the five pages for aligned labels, 40px controls, consistent buttons, functional navigation, no overflow and no console errors.

- [ ] **Step 6: Commit Task 8**

```bash
git add src/components/overview src/app/api/overview src/app/overview.client.tsx src/app/page.tsx tests/unit/overview.test.ts tests/unit/workspace-copy.test.ts
git commit -m "feat: complete competition workspace overview"
```

## Final delivery gate

- [ ] Run `git status --short` and ensure only intentional changes are present.
- [ ] Run `pnpm test` and retain the passing output.
- [ ] Run `pnpm build` and retain the output or document a reproducible environment-only issue.
- [ ] Start the app and execute the role acceptance matrix from Task 8.
- [ ] Review desktop, tablet and mobile screenshots in browser before claiming completion.
- [ ] Report any Cloudflare deployment blocker separately; do not label local UI verification as an online deployment.
