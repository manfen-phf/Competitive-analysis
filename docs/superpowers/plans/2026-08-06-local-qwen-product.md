# Local Qwen Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a local, end-to-end merchant competition analysis app using Qwen-VL-Plus for screenshot extraction.

**Architecture:** Keep the existing Next.js API/UI and SQLite/Prisma local database. Replace the provider adapter only, preserve strict validation, then improve page composition and test all paths locally.

**Tech Stack:** Next.js 15, React 19, Prisma SQLite, Vitest, SheetJS, DashScope OpenAI-compatible API.

## Global Constraints

- Local execution uses `pnpm dev` and `DATABASE_URL=file:./dev.db`.
- Provider environment variables are `QWEN_API_KEY` and `QWEN_MODEL=qwen-vl-plus`.
- Missing recognition fields must reject upload and never create an order record.
- Do not deploy in this stage.

### Task 1: Qwen recognition adapter

**Files:**
- Modify: `src/lib/ocr.ts`
- Modify: `.env.example`
- Test: `tests/unit/ocr.test.ts`

- [ ] Add a failing test asserting the provider uses the Qwen model and reports a missing `QWEN_API_KEY`.
- [ ] Implement DashScope compatible API request with JSON-only extraction and existing validation.
- [ ] Run `pnpm test -- tests/unit/ocr.test.ts`.

### Task 2: Local product workflow

**Files:**
- Modify: `src/app/page.tsx`, `src/app/upload/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/admin/import/page.tsx`, `src/app/globals.css`
- Test: `tests/unit/master-data.test.ts`, `tests/unit/analytics.test.ts`

- [ ] Preserve the required import, merchant selector, date filters and competition metrics.
- [ ] Add clear loading, success, empty and error states without inert controls.
- [ ] Run the unit test suite and local browser workflow.

### Task 3: Local verification

**Files:**
- Modify: `README.md`

- [ ] Initialize SQLite with Prisma.
- [ ] Import the supplied Excel and verify merchant search.
- [ ] Run `pnpm test` and `pnpm build`; document Qwen key setup and local commands.
