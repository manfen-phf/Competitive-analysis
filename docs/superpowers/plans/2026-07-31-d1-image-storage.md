# D1 Screenshot Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the full dashboard to Cloudflare Workers without R2 by storing validated screenshots in D1.

**Architecture:** `Upload` owns screenshot bytes and MIME type. Route handlers persist and read those fields through Prisma/D1; Agnes receives a token-protected internal image URL. The Worker has only a D1 binding.

**Tech Stack:** Next.js 15, Prisma 6 with D1 adapter, Cloudflare Workers/OpenNext, Vitest, Wrangler.

## Global Constraints

- Do not use R2 or create an R2 subscription or bucket.
- Accept only PNG, JPEG, and WebP screenshots of at most 1,800,000 bytes.
- Invalid screenshots must not produce valid orders.
- Keep image access token-protected and preserve strict recognition rules.
- Build full-stack Next.js with Cloudflare Workers/OpenNext, not static Pages export.

---

### Task 1: Specify D1 screenshot limits

**Files:**
- Create: `tests/unit/storage.test.ts`
- Modify: `src/lib/storage.ts`

**Interfaces:** Produces `MAX_SCREENSHOT_BYTES = 1_800_000`, `assertSupportedScreenshot(bytes: Buffer, mimeType: string): void`, and `imageResponse(data: Uint8Array, mimeType: string)`.

- [ ] **Step 1: Write the failing test**

```ts
expect(() => assertSupportedScreenshot(Buffer.alloc(1_800_001), "image/png"))
  .toThrow("截图不能超过 1.8MB");
expect(() => assertSupportedScreenshot(Buffer.from([1]), "image/gif"))
  .toThrow("仅支持 PNG、JPG 和 WebP 截图");
```

- [ ] **Step 2: Run it and verify failure**

Run: `pnpm vitest run tests/unit/storage.test.ts`

Expected: FAIL because the helpers do not exist.

- [ ] **Step 3: Implement the minimal validation**

```ts
export const MAX_SCREENSHOT_BYTES = 1_800_000;
export function assertSupportedScreenshot(bytes: Buffer, mimeType: string) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType)) throw new Error("仅支持 PNG、JPG 和 WebP 截图");
  if (bytes.byteLength > MAX_SCREENSHOT_BYTES) throw new Error("截图不能超过 1.8MB");
}
```

- [ ] **Step 4: Run the focused test**

Run: `pnpm vitest run tests/unit/storage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts tests/unit/storage.test.ts
git commit -m "test: define D1 screenshot storage limits"
```

### Task 2: Persist screenshot bytes in D1

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `migrations/0002_d1_image_storage.sql`
- Modify: `src/app/api/uploads/route.ts`
- Modify: `src/app/api/uploads/[id]/image/route.ts`
- Modify: `tests/unit/db-schema.test.ts`

**Interfaces:** `Upload.imageData: Bytes`, `Upload.imageMimeType: String`, and `publicUploadImageUrl(origin, uploadId, token)`.

- [ ] **Step 1: Write failing schema assertions**

```ts
expect(schema).toContain("imageData        Bytes");
expect(schema).toContain("imageMimeType    String");
expect(migration).toContain("imageData BLOB NOT NULL");
```

- [ ] **Step 2: Run it and verify failure**

Run: `pnpm vitest run tests/unit/db-schema.test.ts`

Expected: FAIL because `Upload` has only an R2 path.

- [ ] **Step 3: Add schema, migration, and route changes**

Add non-null `imageData` and `imageMimeType`. Make migration 0002 rebuild `Upload` with BLOB storage so SQLite can enforce both fields. In POST, call `assertSupportedScreenshot`, then create the upload with bytes and MIME type. Pass `request.nextUrl.origin` to `publicUploadImageUrl`. In GET, query data/MIME after token validation and return no-store image bytes.

- [ ] **Step 4: Run tests and validate migration shape**

Run: `pnpm vitest run tests/unit/db-schema.test.ts tests/unit/storage.test.ts && pnpm exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`

Expected: tests PASS and generated SQL contains BLOB image storage.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma migrations/0002_d1_image_storage.sql src/app/api/uploads tests/unit/db-schema.test.ts src/lib/storage.ts
git commit -m "feat: store upload screenshots in D1"
```

### Task 3: Remove R2 configuration

**Files:**
- Modify: `wrangler.jsonc`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `src/lib/storage.ts`
- Modify: `tests/unit/storage.test.ts`

**Interfaces:** `wrangler.jsonc` retains `DB` only; no runtime code accesses `PUBLIC_APP_URL`.

- [ ] **Step 1: Add failing configuration assertions**

```ts
expect(wranglerConfig).not.toContain('"r2_buckets"');
expect(storageSource).not.toContain("PUBLIC_APP_URL");
```

- [ ] **Step 2: Run it and verify failure**

Run: `pnpm vitest run tests/unit/storage.test.ts`

Expected: FAIL while R2 configuration remains.

- [ ] **Step 3: Remove R2 and document the D1 limit**

Delete `r2_buckets` and `R2Bucket` usage. Remove `PUBLIC_APP_URL` from the example environment. Document origin-derived Agnes URLs and the 1.8MB limit in README.

- [ ] **Step 4: Verify**

Run: `pnpm vitest run tests/unit/storage.test.ts && rg -n "r2_buckets|ORDER_IMAGES|PUBLIC_APP_URL" --glob '!docs/**'`

Expected: tests PASS and ripgrep has no runtime matches.

- [ ] **Step 5: Commit**

```bash
git add wrangler.jsonc .env.example README.md src/lib/storage.ts tests/unit/storage.test.ts
git commit -m "chore: remove R2 deployment dependency"
```

### Task 4: Verify and deploy through Workers Git build

**Files:**
- Modify if needed: `migrations/0002_d1_image_storage.sql`, `README.md`

**Interfaces:** remote D1 receives migration 0002 and GitHub `main` contains the complete implementation.

- [ ] **Step 1: Run full verification**

Run: `pnpm test && pnpm build`

Expected: all Vitest cases PASS and Next production build succeeds.

- [ ] **Step 2: Apply the D1 migration**

Run: `pnpm exec wrangler d1 migrations apply gx-food-delivery-competition-db --remote`

Expected: `0002_d1_image_storage.sql` applies once.

- [ ] **Step 3: Push**

```bash
git add migrations README.md
git commit -m "fix: validate D1 image storage migration"
git push origin main
```

- [ ] **Step 4: Configure Cloudflare Workers Git build**

Import `manfen-phf/Competitive-analysis` in Workers & Pages. Use `pnpm install --frozen-lockfile` and `pnpm exec opennextjs-cloudflare build`; bind `gx-food-delivery-competition-db` as `DB`.

- [ ] **Step 5: Verify deployment**

Open `/api/health` on the Worker URL and expect HTTP 200. Then set `AGNES_API_KEY` and `ADMIN_IMPORT_PASSCODE` as Worker Secrets.
