import { describe, expect, it } from "vitest";
import { chunkStatements } from "../../src/lib/d1-batch";

describe("D1 batch writes", () => {
  it("splits a large master-data import into batches of at most 100 statements", () => {
    const batches = chunkStatements(Array.from({ length: 13_579 }, (_, index) => index));

    expect(batches).toHaveLength(136);
    expect(Math.max(...batches.map((batch) => batch.length))).toBe(100);
    expect(batches.flat()).toEqual(Array.from({ length: 13_579 }, (_, index) => index));
  });
});
