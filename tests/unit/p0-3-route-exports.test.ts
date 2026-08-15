import { describe, expect, it } from "vitest";

describe("P0-3 recognition route surface", () => {
  it("exposes owner-scoped collection read, recognition and confirmation routes", async () => {
    const collection = await import("@/app/api/collections/[id]/route");
    const recognize = await import("@/app/api/collections/[id]/recognize/route");

    expect(typeof collection.GET).toBe("function");
    expect(typeof collection.POST).toBe("function");
    expect(typeof recognize.POST).toBe("function");
  });
});
