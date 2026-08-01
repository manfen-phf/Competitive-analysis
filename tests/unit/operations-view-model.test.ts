import { describe, expect, it } from "vitest";
import { toOperationsOverview } from "@/lib/operations-view-model";

const analytics = {
  platforms: {
    MEITUAN: { validOrderCount: 6, userPaidAmount: 35, platformRedPacket: 4, paidDeliveryFee: 3, merchantSettlementAmount: 25 },
    B_JIA: { validOrderCount: 6, userPaidAmount: 29, platformRedPacket: 3, paidDeliveryFee: 2, merchantSettlementAmount: 24 },
  },
  userPaidDifference: 6,
  merchantRanking: [
    { merchantId: "m-1", merchantName: "A", meituanUserPaid: 35, bJiaUserPaid: 29, userPaidDifference: 6 },
  ],
};

describe("toOperationsOverview", () => {
  it("creates a warning brief when the platform payment difference is adverse", () => {
    const overview = toOperationsOverview(analytics, "MANAGER");

    expect(overview.brief.tone).toBe("warning");
    expect(overview.actions[0].id).toBe("review-anomalies");
    expect(overview.healthScore).toBeLessThan(100);
  });

  it("prioritizes the role-specific first action without changing evidence", () => {
    expect(toOperationsOverview(analytics, "OPERATOR").actions[0].id).toBe("upload-order");
    expect(toOperationsOverview(analytics, "HQ").actions[0].id).toBe("review-city-signal");
    expect(toOperationsOverview(analytics, "HQ").signals).toHaveLength(3);
  });

  it("returns an empty-state overview instead of fabricated analytics", () => {
    const overview = toOperationsOverview({ ...analytics, platforms: { MEITUAN: { ...analytics.platforms.MEITUAN, validOrderCount: 0 }, B_JIA: { ...analytics.platforms.B_JIA, validOrderCount: 0 } }, merchantRanking: [] }, "OPERATOR");
    expect(overview.healthScore).toBeNull();
    expect(overview.anomalies).toHaveLength(0);
  });
});