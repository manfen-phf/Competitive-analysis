import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

import { createFixedOriginRequest, proxyToFixedOrigin } from "@/lib/pages-proxy";

const UPSTREAM = "https://gx-food-delivery-competition.136010028.workers.dev";

describe("Pages access proxy", () => {
  it("forwards path, query, cookie and POST body only to the fixed Worker origin", async () => {
    const source = new Request("https://gx-food-delivery-competition-web.pages.dev/api/collections?merchant=1001", {
      method: "POST",
      headers: { Cookie: "bd_session=token", Host: "gx-food-delivery-competition-web.pages.dev", "content-type": "text/plain" },
      body: "image-payload",
    });

    const request = createFixedOriginRequest(source, UPSTREAM);

    expect(request.url).toBe(`${UPSTREAM}/api/collections?merchant=1001`);
    expect(request.headers.get("cookie")).toBe("bd_session=token");
    expect(request.headers.get("host")).toBeNull();
    expect(await request.text()).toBe("image-payload");
  });

  it.each([undefined, "http://gx-food-delivery-competition.136010028.workers.dev", "https://evil.example"])("rejects an unapproved upstream %s", (origin) => {
    expect(() => createFixedOriginRequest(new Request("https://web.pages.dev/"), origin)).toThrow("Pages upstream");
  });

  it("does not attach a body to GET requests", () => {
    const request = createFixedOriginRequest(new Request("https://web.pages.dev/dashboard"), UPSTREAM);
    expect(request.method).toBe("GET");
    expect(request.body).toBeNull();
  });

  it("returns the upstream response unchanged", async () => {
    const fetcher = vi.fn(async () => new Response("ok", { status: 201, headers: { "set-cookie": "bd_session=new-token; Path=/; HttpOnly" } }));

    const response = await proxyToFixedOrigin(new Request("https://web.pages.dev/api/auth/login", { method: "POST", body: "payload" }), UPSTREAM, fetcher);

    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toContain("bd_session=new-token");
    await expect(response.text()).resolves.toBe("ok");
  });

  it("exposes one Pages catch-all handler", async () => {
    const module = await import("../../functions/[[path]]");
    expect(typeof module.onRequest).toBe("function");
  });

  it("documents the exact fixed worker origin rather than an arbitrary proxy target", () => {
    const guide = readFileSync("docs/cloudflare-pages-proxy.md", "utf8");
    expect(guide).toContain("gx-food-delivery-competition.136010028.workers.dev");
    expect(guide).toContain("不复制 D1、R2、千问或会话密钥");
  });
});
