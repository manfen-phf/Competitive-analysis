import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { OverviewSummary } from "@/components/overview/overview-summary";

vi.stubGlobal("React", React);

describe("overview quick actions", () => {
  it("opens the pending-confirmation queue instead of a new blank collection", () => {
    const markup = renderToStaticMarkup(<OverviewSummary snapshot={{
      todayMerchantCount: 0,
      capturedOrderCount: 0,
      pendingConfirmationCount: 1,
      failedRecognitionCount: 0,
      attention: [],
    }} />);

    expect(markup).toContain('href="/upload?view=pending"');
  });
});
