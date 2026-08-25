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

  it("keeps the overview focused on the three collection workflow actions", () => {
    const overview = readFileSync(join(process.cwd(), "src/components/overview/overview-summary.tsx"), "utf8");

    expect(overview).toContain("继续采集");
    expect(overview).toContain("查看待确认");
    expect(overview).toContain("进入竞争分析");
    expect(overview).not.toContain("AI 助手");
    expect(overview).not.toContain("任务中心");
  });
});
