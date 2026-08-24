import { describe, expect, it } from "vitest";

import { trendBarHeight } from "@/components/analytics/trend-chart";

describe("trendBarHeight", () => {
  it("does not draw a positive-height bar for zero or missing observations", () => {
    expect(trendBarHeight(0, 40)).toBe("0%");
    expect(trendBarHeight(null, 40)).toBe("0%");
  });

  it("draws only observed positive values relative to the visible maximum", () => {
    expect(trendBarHeight(20, 40)).toBe("50%");
  });
});
