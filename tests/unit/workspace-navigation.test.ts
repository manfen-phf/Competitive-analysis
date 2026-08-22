import { describe, expect, it } from "vitest";

import { navItemsFor } from "@/components/workspace/workspace-rail";
import type { SessionUser } from "@/lib/auth";

function user(role: SessionUser["role"]): SessionUser {
  return { id: "user-1", username: "test", role, city: "玉林", bdName: role === "BD" ? "张三" : null };
}

describe("workspace navigation", () => {
  it("does not expose protected data destinations to a BD", () => {
    expect(navItemsFor(user("BD")).map((item) => item.href)).toEqual(["/", "/upload", "/dashboard"]);
  });

  it("gives a city administrator the data center but not master data", () => {
    expect(navItemsFor(user("CITY_ADMIN")).map((item) => item.href)).toEqual(["/", "/upload", "/dashboard", "/health"]);
  });

  it("gives a super administrator every workspace destination", () => {
    expect(navItemsFor(user("SUPER_ADMIN")).map((item) => item.href)).toEqual(["/", "/upload", "/dashboard", "/health", "/admin/import"]);
  });
});
