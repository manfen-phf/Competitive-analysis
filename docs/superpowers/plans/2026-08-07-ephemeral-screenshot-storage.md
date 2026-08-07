# Ephemeral Screenshot Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save only validated structured order data and recognition JSON; discard uploaded screenshots after Qwen recognition.

**Architecture:** The upload API retains screenshot bytes only in request memory, sends them to Qwen, then stores an Upload audit row plus normalized OrderRecord and raw JSON. No CloudBase Storage, CFS, or image endpoint is required. Administrator export uses the saved normalized records.

**Tech Stack:** Next.js, Prisma PostgreSQL, Qwen compatible API, XLSX.

## Global Constraints
- Keep Qwen-VL-Plus as the recognition model.
- Reject missing mandatory fields.
- Never store screenshots or API keys in the database or repository.

### Task 1: Remove screenshot persistence
- [ ] Write failing schema/API tests proving no image fields or CloudBase storage calls remain.
- [ ] Change Upload to store hash, MIME type, recognition JSON, and timestamps only.
- [ ] Remove image viewing endpoint/UI.
- [ ] Verify focused tests.

### Task 2: Administrator data export
- [ ] Add an authenticated admin XLSX export route for recognized records.
- [ ] Add a download action to the administrator page.
- [ ] Verify focused tests and production build.