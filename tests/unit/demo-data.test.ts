import { describe, expect, it } from "vitest";
import { DEMO_CITIES, DEMO_RECORDS } from "../../src/lib/demo-data";

describe("demo data", () => {
  it("contains ten merchants per city and both platforms", () => {
    expect(DEMO_CITIES).toHaveLength(6);
    expect(DEMO_RECORDS).toHaveLength(120);
    for (const city of DEMO_CITIES) {
      const rows = DEMO_RECORDS.filter((row) => row.city === city);
      expect(new Set(rows.map((row) => row.merchantId)).size).toBe(10);
      expect(new Set(rows.map((row) => row.platform))).toEqual(new Set(["MEITUAN", "B_JIA"]));
    }
  });
});
