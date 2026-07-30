import { describe, expect, it } from "vitest";
import { getReportPeriod } from "../../src/lib/time";

describe("getReportPeriod", () => {
  it("uses the partial first week as W1", () => {
    expect(getReportPeriod(new Date("2026-01-03T12:00:00+08:00")).weekKey).toBe("2026-W1");
  });

  it("starts W2 on the first Monday after new year", () => {
    expect(getReportPeriod(new Date("2026-01-05T12:00:00+08:00")).weekKey).toBe("2026-W2");
  });
});
