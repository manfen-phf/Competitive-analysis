# P0-3 千问订单识别与人工确认 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让已保存的美团与 B 家订单长图经千问识别成完整结构化订单数据，并由采集 BD 核对确认后写入 D1。

**Architecture:** 采集会话是唯一业务边界。识别服务从 D1 查询会话及两张 R2 原图，调用千问兼容 API，使用既有严格字段校验保存 `RecognitionResult` 或 `RecognitionFailureV1`。确认接口只允许会话所属 BD 写入 `ConfirmedOrder`，会话状态依次为 `UPLOADED`、`RECOGNIZED`、`CONFIRMED` 或 `RECOGNITION_FAILED`。

**Tech Stack:** Next.js App Router、Cloudflare Workers、D1、R2、DashScope 千问兼容 API、Vitest。

## Global Constraints

- 仅使用 Cloudflare D1、R2 和千问；不得恢复 PostgreSQL、CloudBase 或 Agnes 运行依赖。
- D1 仅保存元数据及 JSON；订单原图继续存于 R2。
- 美团与 B 家均必须产生完整 13 项金额字段，缺项、低置信度或配送费关系不一致一律不得确认入库。
- 所有读写均须按 BD 会话校验归属；不得信任浏览器传入的 BD 或商家身份。

---

### Task 1: 千问识别 Provider

**Files:**
- Modify: `src/lib/recognition-provider.ts`
- Modify: `src/lib/ocr.ts`
- Test: `tests/unit/recognition-provider.test.ts`

**Interfaces:**
- Produces `createQwenRecognitionProvider(config).recognize({ imageDataUrl, expectedPlatform })`。
- Returns `RecognitionResult` after JSON 解包，不合规内容抛出明确错误。

- [ ] **Step 1: Write failing tests** for API request body, fenced JSON parsing, complete response acceptance and missing field rejection.
- [ ] **Step 2: Run the focused test** and confirm it fails because the implementation does not support P0-3.
- [ ] **Step 3: Implement** a minimal DashScope compatible API call with a Chinese schema-only prompt and strict Zod validation.
- [ ] **Step 4: Run focused tests** and confirm they pass.

### Task 2: 会话识别与确认服务

**Files:**
- Create: `src/lib/collection-recognition.ts`
- Modify: `src/lib/r2-storage.ts`
- Test: `tests/unit/collection-recognition.test.ts`

**Interfaces:**
- Consumes a D1 database, R2 bucket, collection id, owning BD id and recognition provider.
- Produces `recognizeCollection()` and `confirmCollection()` with persisted D1 results.

- [ ] **Step 1: Write failing tests** for ownership denial, two-image recognition, strict failure persistence, and dual-platform confirmation.
- [ ] **Step 2: Run the focused test** and confirm it fails because the service does not exist.
- [ ] **Step 3: Implement** minimal D1/R2 orchestration and D1 batch writes.
- [ ] **Step 4: Run focused tests** and confirm they pass.

### Task 3: P0-3 API routes and BD confirmation page

**Files:**
- Create: `src/app/api/collections/[id]/recognize/route.ts`
- Create: `src/app/api/collections/[id]/route.ts`
- Create: `src/app/collect/[id]/page.tsx`
- Modify: `src/app/collect/page.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/unit/p0-3-route-exports.test.ts`
- Test: `tests/unit/collection-confirm-page.test.ts`

**Interfaces:**
- `POST /api/collections/:id/recognize` calls only with a signed BD session.
- `GET /api/collections/:id` returns its owner-visible result and image metadata.
- `POST /api/collections/:id` accepts corrected dual-platform structured results and confirms both orders.

- [ ] **Step 1: Write failing route and page tests** for the new API/page surface.
- [ ] **Step 2: Run focused tests** and confirm they fail because the routes/pages are absent.
- [ ] **Step 3: Implement** the smallest UI that moves an uploaded collection directly into recognition and editable confirmation.
- [ ] **Step 4: Run focused tests** and confirm they pass.

### Task 4: Real Cloudflare validation

**Files:**
- Modify only when a concrete deploy/runtime fault requires it.

- [ ] **Step 1: Run all unit tests and production Worker build.**
- [ ] **Step 2: Deploy to the existing Worker.**
- [ ] **Step 3: Configure `QWEN_API_KEY` as a Cloudflare secret without exposing it.**
- [ ] **Step 4: Upload two real order screenshots and verify D1 result, R2 original and browser confirmation on desktop and mobile.**
- [ ] **Step 5: Commit and push only after fresh verification.**

## Self-review

- Strict dual-platform/complete-field validation is covered in Tasks 1 and 2.
- BD ownership is enforced in Tasks 2 and 3.
- The plan deliberately excludes comparison, statistics and Excel export; they remain P0-4 through P0-6.
- No PostgreSQL, CloudBase or Agnes runtime dependency is introduced.
