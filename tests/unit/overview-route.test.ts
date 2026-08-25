import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: null as null | { id: string; username: string; role: "SUPER_ADMIN" | "CITY_ADMIN" | "BD"; city: string | null; bdName: string | null },
  assignmentMerchantIds: [] as string[],
  collectionWhere: undefined as Record<string, unknown> | undefined,
  orderWhere: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@/lib/auth", () => ({ getSession: async () => state.user }));
vi.mock("@/lib/db", () => ({
  getPrisma: async () => ({
    merchantAssignment: {
      findMany: async () => state.assignmentMerchantIds.map((merchantId) => ({ merchantId })),
    },
    collectionTask: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        state.collectionWhere = where;
        return [];
      },
    },
    orderRecord: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        state.orderWhere = where;
        return [];
      },
    },
  }),
}));

import { GET as getOverview } from "@/app/api/overview/route";

describe("overview API authorization boundary", () => {
  beforeEach(() => {
    state.user = { id: "bd-1", username: "张三", role: "BD", city: "玉林", bdName: "张三" };
    state.assignmentMerchantIds = ["M-current"];
    state.collectionWhere = undefined;
    state.orderWhere = undefined;
  });

  it("uses the BD's active merchant assignments for historical overview rows after reassignment", async () => {
    const response = await getOverview();

    expect(response.status).toBe(200);
    expect(state.collectionWhere).toMatchObject({ merchantId: { in: ["M-current"] } });
    expect(state.orderWhere).toMatchObject({ merchantId: { in: ["M-current"] } });
    expect(state.collectionWhere).not.toHaveProperty("bdName");
    expect(state.orderWhere).not.toHaveProperty("bdName");
  });
});
