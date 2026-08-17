import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("workspace foundation", () => {
  it("defines dark-first workspace tokens and a reduced-motion fallback", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toContain('[data-theme="dark"]');
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("--surface-focus");
  });

  it("mounts a navigable workspace rail and command entry point", () => {
    const shell = readFileSync(
      join(process.cwd(), "src/components/workspace/workspace-shell.tsx"),
      "utf8",
    );

    expect(shell).toContain("WorkspaceRail");
    expect(shell).toContain("CommandPalette");
  });

  it("keeps the primary navigation focused on the V1 collection loop", () => {
    const rail = readFileSync(
      join(process.cwd(), "src/components/workspace/workspace-rail.tsx"),
      "utf8",
    );

    expect(rail).toContain('href: "/collect"');
    expect(rail).toContain('href: "/dashboard"');
    expect(rail).toContain('href: "/records"');
    expect(rail).not.toContain('label: "AI"');
    expect(rail).not.toContain('label: "\\u6211\\u7684"');
  });

  it("uses explicit expanded and collapsed rail dimensions", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toContain("--workspace-rail-collapsed-width: 72px");
    expect(css).toContain("--workspace-rail-expanded-width: 232px");
    expect(css).toContain('[data-rail="collapsed"] .workspace-rail-link > span');
    expect(css).toContain("grid-template-columns:var(--workspace-rail-current-width) minmax(0,1fr)");
    expect(css).toContain(".workspace-panel{width:var(--workspace-ai-width)");
    expect(css).not.toContain("grid-template-columns:var(--rail-width) minmax(0,1fr)");
  });
  it("presents the home as an operations command deck", () => {
    const home = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
    expect(home).toContain("/api/analytics");
    expect(home).toContain("采集健康度");
    expect(home).toContain("异常预警");
  });

  it("uses collection progress instead of a generic task workspace on the overview", () => {
    const home = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");

    expect(home).toContain("\\u4eca\\u65e5\\u91c7\\u96c6\\u6982\\u89c8");
    expect(home).toContain("\\u5f85\\u786e\\u8ba4\\u8bc6\\u522b");
    expect(home).not.toContain("\\u4e09\\u4ef6\\u91cd\\u8981\\u7684\\u4e8b");
  });

  it("keeps the analysis and management screens in readable Chinese", () => {
    const dashboard = readFileSync(join(process.cwd(), "src/app/dashboard/page.tsx"), "utf8");
    const records = readFileSync(join(process.cwd(), "src/app/records/page.tsx"), "utf8");
    const health = readFileSync(join(process.cwd(), "src/app/health/page.tsx"), "utf8");

    expect(dashboard).toContain("竞争定价分析");
    expect(dashboard).toContain('href="/collect"');
    expect(records).toContain("全部城市");
    expect(health).toContain("采集健康度");
  });
});
