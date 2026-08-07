import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("CloudBase 容器启动配置", () => {
  it("在容器启动时执行 PostgreSQL 迁移", () => {
    const dockerfile = readFileSync(join(process.cwd(), "Dockerfile"), "utf8");
    expect(dockerfile).toContain("scripts/start-cloudbase.mjs");
  });

  it("不再依赖 CloudBase 图片存储 SDK", () => {
    const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    expect(config).not.toContain("@cloudbase/js-sdk");
  });
});