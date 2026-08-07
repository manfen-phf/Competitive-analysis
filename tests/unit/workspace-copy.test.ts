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
  it("presents the home as an operations command deck", () => {
    const home = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
    expect(home).toContain("OperationsBrief");
    expect(home).toContain("toOperationsOverview");
  });
});
