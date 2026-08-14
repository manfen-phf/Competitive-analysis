import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(fullPath);
    return entry.name === "route.ts" ? [fullPath] : [];
  });
}

describe("V1 runtime boundaries", () => {
  it("keeps unfinished routes behind the P0 gate while allowing the accepted P0-1 import route", () => {
    const routes = routeFiles(join(process.cwd(), "src/app/api"));

    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      const source = readFileSync(route, "utf8");
      if (route.endsWith(join("admin", "master-data", "route.ts"))) {
        expect(source).toContain("handleMasterDataPost");
      } else {
        expect(source).toContain("p0Unavailable");
      }
      expect(source).not.toContain("imageData");
      expect(source).not.toContain("recognizeOrderScreenshot");
      expect(source).not.toContain("AGNES");
      expect(source).not.toContain("cloudbase");
    }
  });
});
