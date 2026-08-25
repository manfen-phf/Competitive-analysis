import React from "react";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ initializeCalls: 0 }));

vi.mock("@/lib/auth", () => ({
  initializeAuthentication: async () => {
    state.initializeCalls += 1;
  },
  getSession: async () => null,
}));

import RootLayout from "@/app/layout";

vi.stubGlobal("React", React);

describe("root authentication initialization", () => {
  it("initializes authentication for every root application request", async () => {
    await RootLayout({ children: null });

    expect(state.initializeCalls).toBe(1);
  });
});
