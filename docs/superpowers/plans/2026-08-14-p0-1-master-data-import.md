# P0-1 商家主数据导入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 管理员可把每日合作商 Excel 全量同步至 Cloudflare D1，并查看城市、商家及其负责 BD 关联。

**Architecture:** 后端新增一个独立的 Excel 解析与校验模块，接口在完成全部校验后才调用 D1 批量写入。`/admin/import` 继续承担管理员口令校验、文件提交和结果展示，新增商家列表接口供页面筛选查看。运行时只读取 Cloudflare D1 binding，不调用 PostgreSQL、CloudBase、R2 或 AI 服务。

**Tech Stack:** Next.js App Router、React、TypeScript、zod、xlsx、Cloudflare Workers、Cloudflare D1、Vitest。

## Global Constraints

- V1 结构化业务数据只使用 Cloudflare D1 `DB` binding。
- 仅导入 `外卖组织结构`、`商家ID`、`商家名称`、`合作BD` 四列。
- 以 `(城市, 商家ID)` 识别商家；商家 ID 全程按文本处理。
- 文件任一行校验失败时不得写入 D1。
- 每日同步只新增或更新本次文件中的数据，不删除历史商家或关联。
- 本阶段不得实现 BD 登录、订单上传、AI 识别、R2 业务存储、统计、导出或其他页面。
- 所有 P0-1 完成声明必须包含真实线上 D1 导入验证和 PC/手机验证证据。

---

### Task 1: 建立可测试的 Excel 行规范化与校验模块

**Files:**
- Create: `src/lib/master-data-import.ts`
- Create: `tests/unit/master-data-import.test.ts`

**Interfaces:**
- Consumes: `ArrayBuffer` Excel 文件内容、可选 `effectiveFrom: string`。
- Produces: `parseMasterDataWorkbook(buffer, effectiveFrom): ImportPreview`。
- `ImportPreview` 必须包含 `rows: NormalizedMerchantRow[]`、`errors: ImportRowError[]`、`summary`。

- [ ] **Step 1: 写出失败测试**

```ts
expect(() => parseMasterDataWorkbook(workbookMissingHeaders, "2026-08-14"))
  .toThrow("缺少必需列：合作BD");
expect(() => parseMasterDataWorkbook(workbookWithDuplicateKey, "2026-08-14"))
  .toThrow("第 3 行与第 2 行的城市和商家ID重复");
```

- [ ] **Step 2: 运行测试，确认缺少模块而失败**

Run: `pnpm test -- tests/unit/master-data-import.test.ts`

Expected: FAIL，提示模块或函数不存在。

- [ ] **Step 3: 实现最小解析与校验**

```ts
export type NormalizedMerchantRow = {
  rowNumber: number;
  cityName: string;
  merchantCode: string;
  merchantName: string;
  bdName: string;
  effectiveFrom: string;
};

export function parseMasterDataWorkbook(buffer: ArrayBuffer, effectiveFrom: string): ImportPreview {
  // 读取首个工作表；验证四列；将商家ID转换为文本；校验空值和重复键。
}
```

- [ ] **Step 4: 运行单元测试，覆盖正常、缺列、空值、重复键和数字商家 ID**

Run: `pnpm test -- tests/unit/master-data-import.test.ts`

Expected: PASS，至少 6 个断言覆盖上述情形。

- [ ] **Step 5: 提交**

```bash
git add src/lib/master-data-import.ts tests/unit/master-data-import.test.ts
git commit -m "feat: validate merchant master data workbook"
```

### Task 2: 实现 D1 全量同步写入服务

**Files:**
- Create: `src/lib/d1-master-data.ts`
- Modify: `migrations/0003_v1_core_baseline.sql`（仅在缺少必要索引时追加新迁移，绝不重写已应用迁移）
- Create: `tests/unit/d1-master-data.test.ts`

**Interfaces:**
- Consumes: `D1Database`、`NormalizedMerchantRow[]`。
- Produces: `syncMasterData(db, rows): Promise<ImportSummary>`。
- `ImportSummary` 返回 `totalRows`、`insertedMerchants`、`updatedMerchants`、`insertedBds`、`updatedAssignments`、`cityCount`、`bdCount`。

- [ ] **Step 1: 写出失败测试**

```ts
const result = await syncMasterData(fakeD1, rows);
expect(result).toMatchObject({ totalRows: 2, insertedMerchants: 2, insertedBds: 2 });
expect(fakeD1.sql).toContain("INSERT INTO MerchantBdAssignment");
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- tests/unit/d1-master-data.test.ts`

Expected: FAIL，提示同步服务不存在。

- [ ] **Step 3: 实现幂等 D1 同步**

```ts
export async function syncMasterData(db: D1Database, rows: NormalizedMerchantRow[]) {
  // 批量 upsert City、BD UserAccount、Merchant；
  // 查询并关闭不同 BD 的当前关联；
  // 为当前 BD 插入或复用有效关联；
  // 只在全部写入语句准备完成后执行 db.batch。
}
```

- [ ] **Step 4: 运行测试，覆盖重复导入与 BD 调整**

Run: `pnpm test -- tests/unit/d1-master-data.test.ts`

Expected: PASS，第二次同步不新增商家/BD，BD 变更会关闭旧关联并建立新关联。

- [ ] **Step 5: 提交**

```bash
git add src/lib/d1-master-data.ts tests/unit/d1-master-data.test.ts migrations
git commit -m "feat: sync merchant master data to D1"
```

### Task 3: 完成管理员导入与商家列表 API

**Files:**
- Modify: `src/app/api/admin/master-data/route.ts`
- Create: `src/app/api/admin/master-data/route.test.ts`
- Modify: `src/lib/p0-gate.ts`（移除该 API 的 P0-1 保护，不改变其他 API）

**Interfaces:**
- `POST /api/admin/master-data` 接收 `verifyOnly`、`passcode`、`file`、`effectiveFrom`。
- `GET /api/admin/master-data?city=&query=&bd=` 返回分页商家列表与筛选项。

- [ ] **Step 1: 写出失败测试**

```ts
const response = await POST(requestWithValidWorkbook);
expect(response.status).toBe(200);
expect(await response.json()).toMatchObject({ imported: 2, insertedMerchants: 2 });
```

- [ ] **Step 2: 运行测试，确认目前返回 P0-1 保护错误**

Run: `pnpm test -- src/app/api/admin/master-data/route.test.ts`

Expected: FAIL，响应为现有 503。

- [ ] **Step 3: 实现接口**

```ts
// verifyOnly 只比较 ADMIN_IMPORT_PASSCODE；
// 实际导入先验证口令和文件，再 parseMasterDataWorkbook，再 syncMasterData；
// 校验错误返回 422，且不调用 syncMasterData；
// GET 使用参数化 D1 查询并限定最多 100 条。
```

- [ ] **Step 4: 运行接口测试**

Run: `pnpm test -- src/app/api/admin/master-data/route.test.ts`

Expected: PASS，覆盖错误口令、验证模式、无文件、错误 Excel、正确导入和列表筛选。

- [ ] **Step 5: 提交**

```bash
git add src/app/api/admin/master-data/route.ts src/app/api/admin/master-data/route.test.ts src/lib/p0-gate.ts
git commit -m "feat: add master data import API"
```

### Task 4: 更新管理员导入页面并保持手机可用

**Files:**
- Modify: `src/app/admin/import/page.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/unit/admin-import-page.test.ts`

**Interfaces:**
- Consumes: P0-1 导入 API 响应和 GET 商家列表。
- Produces: 管理员口令校验、文件导入状态、导入摘要、筛选控件和商家关联列表。

- [ ] **Step 1: 写出失败测试**

```ts
expect(importCopy).toContain("本次导入");
expect(importCopy).toContain("负责BD");
expect(importCopy).not.toContain("P0-1 is implemented");
```

- [ ] **Step 2: 运行测试，确认旧保护文案仍存在**

Run: `pnpm test -- tests/unit/admin-import-page.test.ts`

Expected: FAIL，页面仍显示 P0-1 未实现提示。

- [ ] **Step 3: 实现最小页面体验**

```tsx
// 导入成功后展示新增、更新、城市、BD 等摘要；
// 调用 GET 拉取列表；
// 城市、BD 和关键词筛选；
// 采用现有深色工作台视觉，窄屏时控件纵向排列、列表可横向滚动。
```

- [ ] **Step 4: 运行页面单元测试和生产构建**

Run: `pnpm test -- tests/unit/admin-import-page.test.ts && pnpm build`

Expected: PASS，生产构建无 TypeScript 错误。

- [ ] **Step 5: 提交**

```bash
git add src/app/admin/import/page.tsx src/app/globals.css tests/unit/admin-import-page.test.ts
git commit -m "feat: show imported merchant master data"
```

### Task 5: 执行真实 D1 迁移、线上部署与验收

**Files:**
- Modify: `README.md`（补充 P0-1 管理员操作说明和四列模板规则）
- Create: `docs/verification/2026-08-14-p0-1-master-data-import.md`

**Interfaces:**
- Consumes: 已部署 Worker、真实 D1、真实 Excel 文件。
- Produces: 可访问的线上导入页面和可复核的验收记录。

- [ ] **Step 1: 先完成全量本地测试**

Run: 在 WSL 原生工作副本执行 `pnpm test`。

Expected: 所有既有测试和新增测试通过。

- [ ] **Step 2: 构建 Cloudflare Worker**

Run: 在 WSL 原生工作副本执行 `pnpm exec opennextjs-cloudflare build`。

Expected: 生成 `.open-next/worker.js` 且退出码为 0。

- [ ] **Step 3: 对真实 D1 应用仅新增的迁移（如有）**

Run: `pnpm exec wrangler d1 migrations apply gx-food-delivery-competition-db --remote`。

Expected: 成功，不修改或重放 P0-0 已应用迁移。

- [ ] **Step 4: 部署 Worker 并验证线上 API**

Run: `pnpm exec wrangler deploy`，随后调用线上 `POST /api/admin/master-data` 的 verifyOnly 和 GET。

Expected: Worker 显示 D1 binding；管理员口令验证返回成功；GET 返回空或已存在的商家列表。

- [ ] **Step 5: 使用真实 Excel 做两次导入验证**

Run: 在管理员页面导入指定文件两次。

Expected: 第一次导入报告 13,577 总行、8 个城市/区县、81 位 BD；第二次导入不重复新增商家或 BD。

- [ ] **Step 6: 验证失败文件不写入**

Run: 使用只在副本中删除 `合作BD` 表头的测试 Excel 上传。

Expected: HTTP 422 或页面错误提示；导入前后 D1 的 Merchant 行数一致。

- [ ] **Step 7: PC 和手机基础验证，记录证据并提交**

Run: 线上打开 `/admin/import`，桌面宽度与 390px 宽度各完成口令验证、上传入口、摘要和列表检查。

Expected: 无控制台错误；窄屏控件可操作、表格不遮挡主要按钮。

- [ ] **Step 8: 提交并推送**

```bash
git add README.md docs/verification
git commit -m "docs: verify P0-1 master data import"
git push origin v1-core
```
