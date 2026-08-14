# P0-2 BD Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a verified BD-owned merchant selection and dual-platform screenshot collection flow backed by Cloudflare D1 and R2.

**Architecture:** API routes obtain D1/R2 bindings through OpenNext. A lightweight signed cookie identifies the selected internal BD, while D1 enforces current merchant assignment at every upload. A collection request contains both platform screenshots and creates one session with two image records.

**Tech Stack:** Next.js 15, React 19, Cloudflare Workers, D1, R2, Vitest.

## Global Constraints

- Use only D1 for structured V1 data and R2 for screenshots.
- Do not add external identity, database, storage, or AI platforms.
- Maintain the existing accepted P0-1 master-data import.
- Verify every behavior with an automated test before implementation and with the real Cloudflare deployment after implementation.

---

### Task 1: Collection-domain helpers

**Files:**
- Create: `src/lib/bd-session.ts`
- Create: `src/lib/bd-collection.ts`
- Test: `tests/unit/bd-session.test.ts`
- Test: `tests/unit/bd-collection.test.ts`

- [ ] Write failing tests for signed session verification, dual-image validation, and duplicate hash rejection.
- [ ] Run the focused tests and verify they fail because the helpers do not exist.
- [ ] Implement the minimal cookie-signing and D1/R2 collection helpers.
- [ ] Run focused tests and verify they pass.

### Task 2: BD identity, merchant, and upload API routes

**Files:**
- Create: `src/app/api/bd/session/route.ts`
- Create: `src/app/api/bd/merchants/route.ts`
- Modify: `src/app/api/uploads/route.ts`
- Modify: `tests/unit/v1-runtime-boundaries.test.ts`
- Test: `src/app/api/bd/session/route.test.ts`
- Test: `src/app/api/bd/merchants/route.test.ts`
- Test: `src/app/api/uploads/route.test.ts`

- [ ] Write failing route tests for BD ownership, authenticated merchant list, and a valid dual-image upload.
- [ ] Run the focused tests and verify their failure is caused by P0-2 still being gated.
- [ ] Implement the routes using the helper interfaces from Task 1.
- [ ] Run focused tests and verify they pass.

### Task 3: BD collection interface

**Files:**
- Create: `src/app/collect/page.tsx`
- Modify: `src/app/upload/page.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/unit/bd-collection-page.test.ts`

- [ ] Write failing UI copy/flow coverage for BD identity, owned merchant search, and dual platform upload.
- [ ] Run the focused test and verify it fails because the page does not exist.
- [ ] Implement the responsive collection flow.
- [ ] Run focused tests and verify they pass.

### Task 4: Deployment and acceptance

**Files:**
- Modify: `wrangler.jsonc` only if binding types require it.

- [ ] Run all unit tests and the WSL OpenNext production build.
- [ ] Deploy the Worker, configure a generated `BD_SESSION_SECRET`, and run real D1/R2 collection verification.
- [ ] Perform desktop and mobile browser checks with console inspection.
- [ ] Commit and push the verified work to `v1-core`.
