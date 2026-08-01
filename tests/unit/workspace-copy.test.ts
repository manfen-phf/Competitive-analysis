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
});
