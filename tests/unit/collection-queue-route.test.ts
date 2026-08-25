import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: null as null | { id: string; username: string; role: "SUPER_ADMIN" | "CITY_ADMIN" | "BD"; city: string | null; bdName: string | null },
  assignmentMerchantIds: [] as string[],
  collectionWhere: undefined as Record<string, unknown> | undefined,
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
  }),
}));

import { GET as getCollections } from "@/app/api/collections/route";

describe("pending confirmation queue", () => {
  beforeEach(() => {
    state.user = { id: "bd-1", username: "张三", role: "BD", city: "玉林", bdName: "张三" };
    state.assignmentMerchantIds = ["M-current"];
    state.collectionWhere = undefined;
  });

  it("returns only pending collections for the BD's active merchant assignments", async () => {
    const response = await getCollections(new NextRequest("http://localhost/api/collections?status=READY_TO_CONFIRM"));

    expect(response.status).toBe(200);
    expect(state.collectionWhere).toEqual({
      status: "READY_TO_CONFIRM",
      merchantId: { in: ["M-current"] },
    });
  });
});
