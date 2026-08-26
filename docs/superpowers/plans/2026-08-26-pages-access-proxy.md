# Cloudflare Pages 国内访问入口迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the existing Worker-backed application behind a new Cloudflare Pages domain without changing business data or behavior.

**Architecture:** A Pages catch-all Function receives every browser request and creates a new request to one fixed HTTPS Worker origin. It preserves method, path, query string, body and cookie headers, while rejecting invalid or unapproved upstream configuration. The current Next.js Worker remains the only owner of D1, R2, Qwen and session secrets.

**Tech Stack:** Cloudflare Pages Functions, Wrangler 4, TypeScript, Vitest, existing Next.js/OpenNext Worker.

**Spec:** `docs/superpowers/specs/2026-08-26-pages-access-migration-design.md`

## Global Constraints

- Keep `gx-food-delivery-competition` Worker deployed and unchanged as the rollback origin.
- Create only the Pages project `gx-food-delivery-competition-web`; do not alter `xuanchuan` or `bi-front-profit`.
- Do not copy D1, R2, Qwen or login secrets into Pages.
- Pages accepts only the exact HTTPS Worker origin `https://gx-food-delivery-competition.136010028.workers.dev` via the non-public `UPSTREAM_ORIGIN` variable.
- Never commit passwords, tokens, cookies, API keys or real account data.
- Verify proxy behavior locally, then deploy a Pages preview before requesting domestic-network acceptance.

---

## File Structure

- `src/lib/pages-proxy.ts`: pure request validation and fixed-origin request construction.
- `functions/[[path]].ts`: Cloudflare Pages catch-all HTTP handler that calls the shared proxy helper. It intentionally stays outside Next.js' reserved `pages/` source directory and follows Pages' required root `functions/` layout.
- `pages-public/index.html`: minimal deploy asset required by Pages; all application paths are handled by the Function.
- `wrangler.pages.jsonc`: Pages-only Wrangler configuration, separate from existing Worker config.
- `scripts/deploy-pages-proxy.sh`: reproducible Pages deployment script that does not print secrets.
- `tests/unit/pages-proxy.test.ts`: direct security and request-preservation regression tests.
- `docs/cloudflare-pages-proxy.md`: operator instructions for preview deploy, secret configuration, verification, custom domain and rollback.

### Task 1: Build and test the fixed-origin proxy contract

**Files:**
- Create: `src/lib/pages-proxy.ts`
- Create: `tests/unit/pages-proxy.test.ts`

**Interfaces:**
- Produces: `createFixedOriginRequest(request: Request, upstreamOrigin?: string): Request`
- Produces: `proxyToFixedOrigin(request: Request, upstreamOrigin: string, fetcher: typeof fetch): Promise<Response>`
- Consumes: a browser `Request`, `UPSTREAM_ORIGIN`, and a standard `fetch` implementation.

- [ ] **Step 1: Write the failing tests**

```ts
import { createFixedOriginRequest } from "@/lib/pages-proxy";

it("preserves a POST path, query, body and Cookie but replaces host", async () => {
  const request = new Request("https://web.pages.dev/api/collections?a=1", {
    method: "POST", headers: { Cookie: "bd_session=token", Host: "web.pages.dev" }, body: "file"
  });
  const upstream = createFixedOriginRequest(request, EXPECTED);
  expect(upstream.url).toBe(`${EXPECTED}/api/collections?a=1`);
  expect(upstream.headers.get("cookie")).toBe("bd_session=token");
  expect(upstream.headers.get("host")).toBeNull();
  expect(await upstream.text()).toBe("file");
});

it.each([undefined, "http://gx-food-delivery-competition.136010028.workers.dev", "https://evil.example"])(
  "rejects an unapproved upstream %s", (origin) => expect(() => createFixedOriginRequest(new Request("https://web.pages.dev/"), origin)).toThrow()
);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/unit/pages-proxy.test.ts`

Expected: FAIL because `@/lib/pages-proxy` does not exist.

- [ ] **Step 3: Implement the minimal proxy helper**

```ts
export const FIXED_WORKER_ORIGIN = "https://gx-food-delivery-competition.136010028.workers.dev";

export function createFixedOriginRequest(request: Request, upstreamOrigin?: string): Request {
  if (upstreamOrigin !== FIXED_WORKER_ORIGIN) throw new Error("Pages upstream is not configured for this workspace");
  const source = new URL(request.url);
  const target = new URL(`${source.pathname}${source.search}`, FIXED_WORKER_ORIGIN);
  const headers = new Headers(request.headers);
  headers.delete("host");
  return new Request(target, { method: request.method, headers, body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body, redirect: "manual" });
}
```

`proxyToFixedOrigin` must call the injected fetcher with this request and return its response without constructing an HTML error page.

- [ ] **Step 4: Run the focused tests**

Run: `pnpm test tests/unit/pages-proxy.test.ts`

Expected: PASS; tests cover valid forwarding, invalid upstream rejection, GET body omission and response pass-through.

- [ ] **Step 5: Commit the isolated contract**

```bash
git add src/lib/pages-proxy.ts tests/unit/pages-proxy.test.ts
git commit -m "feat: add fixed-origin Pages proxy contract"
```

### Task 2: Add the Pages Function and deploy configuration

**Files:**
- Create: `functions/[[path]].ts`
- Create: `pages-public/index.html`
- Create: `wrangler.pages.jsonc`
- Create: `scripts/deploy-pages-proxy.sh`
- Modify: `package.json`

**Interfaces:**
- Consumes: `proxyToFixedOrigin(request, env.UPSTREAM_ORIGIN, fetch)` from Task 1.
- Produces: a Pages catch-all function with `onRequest(context)` and a `deploy:pages-proxy` script.

- [ ] **Step 1: Write the failing Function boundary test**

```ts
it("exports a Pages onRequest handler and reads only UPSTREAM_ORIGIN", async () => {
  const module = await import("../../functions/[[path]]");
  expect(typeof module.onRequest).toBe("function");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test tests/unit/pages-proxy.test.ts`

Expected: FAIL because the Pages Function file does not exist.

- [ ] **Step 3: Implement the deployable Pages surface**

```ts
import { proxyToFixedOrigin } from "../../src/lib/pages-proxy";

interface Env { UPSTREAM_ORIGIN?: string }
export const onRequest: PagesFunction<Env> = ({ request, env }) => proxyToFixedOrigin(request, env.UPSTREAM_ORIGIN, fetch);
```

Use a separate `wrangler.pages.jsonc` with `pages_build_output_dir: "./pages-public"`, the existing compatibility date and `nodejs_compat`. The shell script must call `wrangler pages deploy --branch main --config wrangler.pages.jsonc`; Pages discovers the root `functions/` directory automatically and the script must not accept arbitrary upstream URLs.

- [ ] **Step 4: Run focused tests and static verification**

Run: `pnpm test tests/unit/pages-proxy.test.ts && pnpm exec tsc --noEmit`

Expected: Pages proxy tests pass. Record any pre-existing TypeScript diagnostics separately; do not suppress them.

- [ ] **Step 5: Commit the Pages surface**

```bash
git add functions/[[path]].ts pages-public/index.html wrangler.pages.jsonc scripts/deploy-pages-proxy.sh package.json tests/unit/pages-proxy.test.ts
git commit -m "feat: add Pages workspace access entry"
```

### Task 3: Produce safe operator documentation and validate locally

**Files:**
- Create: `docs/cloudflare-pages-proxy.md`
- Modify: `README.md`
- Test: `tests/unit/pages-proxy.test.ts`

**Interfaces:**
- Consumes: `UPSTREAM_ORIGIN` contract and `deploy:pages-proxy` script from Tasks 1–2.
- Produces: repeatable command sequence for Pages setup, preview validation, custom-domain binding and rollback.

- [ ] **Step 1: Write the documentation assertion**

```ts
it("documents the exact fixed worker origin rather than an arbitrary proxy target", () => {
  const text = readFileSync("docs/cloudflare-pages-proxy.md", "utf8");
  expect(text).toContain("gx-food-delivery-competition.136010028.workers.dev");
  expect(text).toContain("不复制 D1、R2、千问或会话密钥");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test tests/unit/pages-proxy.test.ts`

Expected: FAIL because the operator guide does not exist.

- [ ] **Step 3: Write the operator instructions**

The guide must cover, in order:

1. Create or select `gx-food-delivery-competition-web` in Pages.
2. Set Pages encrypted variable `UPSTREAM_ORIGIN` to the exact fixed Worker origin.
3. Deploy using `pnpm run deploy:pages-proxy` from an authenticated environment.
4. Test `/login`, a logged-in `/api/auth/me`, static navigation, one authorized upload and an image read.
5. Test production Pages domain from a China network without VPN before binding a custom domain.
6. Bind a custom domain through Pages after successful test.
7. Roll back by removing the Pages DNS/custom domain route; Worker data and service remain untouched.

- [ ] **Step 4: Run full verification available to this change**

Run: `pnpm test tests/unit/pages-proxy.test.ts && pnpm build`

Expected: proxy tests pass; build result is captured exactly, without masking unrelated baseline failures.

- [ ] **Step 5: Commit documentation**

```bash
git add docs/cloudflare-pages-proxy.md README.md tests/unit/pages-proxy.test.ts
git commit -m "docs: add Pages access entry operations guide"
```

### Task 4: Create Pages preview and verify the real Cloudflare entry

**Files:**
- Modify only if deployment output requires an error-path adjustment: `functions/[[path]].ts`, `src/lib/pages-proxy.ts`
- Test: `tests/unit/pages-proxy.test.ts`

**Interfaces:**
- Consumes: deployed Pages `UPSTREAM_ORIGIN` secret and fixed Function from Tasks 1–3.
- Produces: Pages production/preview URL, authenticated response evidence, and documented remaining domestic-network acceptance condition.

- [ ] **Step 1: Confirm Cloudflare authentication and target project**

Run: `pnpm exec wrangler whoami && pnpm exec wrangler pages project list`

Expected: the authenticated account is `136010028@qq.com`; project list contains `gx-food-delivery-competition-web` after creation.

- [ ] **Step 2: Set the non-public Pages variable without displaying its value**

Run: `printf '%s' "$UPSTREAM_ORIGIN_VALUE" | pnpm exec wrangler pages secret put UPSTREAM_ORIGIN --project-name gx-food-delivery-competition-web`

Expected: Wrangler confirms the secret was updated; command output does not show the value.

- [ ] **Step 3: Deploy a Pages preview**

Run: `pnpm run deploy:pages-proxy`

Expected: Wrangler returns a `*.pages.dev` deployment URL for project `gx-food-delivery-competition-web`.

- [ ] **Step 4: Verify proxy security and application reachability**

Run: `curl -i https://<pages-domain>/api/admin/users && curl -i https://<pages-domain>/login`

Expected: unauthenticated admin API returns 401; login route returns a page response; the response must not expose secret values. Then use a legitimate existing test account to validate `/api/auth/me` and one authorized endpoint.

- [ ] **Step 5: Record release status and commit only code changes**

```bash
pnpm test --pool=forks --maxWorkers=1
git status --short
git add <only-pages-proxy-files-if-changed>
git commit -m "fix: harden Pages access entry"
```

Do not commit deployment URLs containing credentials, account bootstrap files, unrelated CloudBase/PostgreSQL work, or historic dirty files.

## Self-Review

- Spec coverage: Tasks 1–2 implement the safe single-origin forwarding layer; Task 3 documents configuration and rollback; Task 4 performs real Pages deployment and end-to-end reachability checks while preserving the current Worker.
- Scope check: no business fields, UI behavior, D1 schema, R2 object layout, Qwen configuration or existing Pages projects are changed.
- Type consistency: `UPSTREAM_ORIGIN` is the only Pages environment value; `createFixedOriginRequest` is consumed by `proxyToFixedOrigin`, which is consumed by the Pages `onRequest` Function.
