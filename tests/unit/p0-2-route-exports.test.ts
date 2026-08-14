import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("P0-2 route exports", () => {
  it("opens BD session, owned merchant, and dual-image upload routes", () => {
    const sessionRoute = readFileSync(join(process.cwd(), "src/app/api/bd/session/route.ts"), "utf8");
    const merchantsRoute = readFileSync(join(process.cwd(), "src/app/api/bd/merchants/route.ts"), "utf8");
    const uploadRoute = readFileSync(join(process.cwd(), "src/app/api/uploads/route.ts"), "utf8");

    expect(sessionRoute).toContain("handleBdSessionPost");
    expect(merchantsRoute).toContain("handleBdMerchantsGet");
    expect(uploadRoute).toContain("handleCollectionPost");
    expect(uploadRoute).not.toContain("p0Unavailable");
  });
});
