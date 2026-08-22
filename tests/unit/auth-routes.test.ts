import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: undefined as undefined | {
    id: string;
    username: string;
    passwordHash: string;
    role: "SUPER_ADMIN" | "CITY_ADMIN" | "BD";
    city: string | null;
    bdName: string | null;
  },
  sessionUser: null as null | {
    id: string;
    username: string;
    role: "SUPER_ADMIN" | "CITY_ADMIN" | "BD";
    city: string | null;
    bdName: string | null;
  },
  createdUser: undefined as undefined | Record<string, unknown>,
  sessionForUserId: undefined as string | undefined,
  cleared: false,
}));

vi.mock("@/lib/db", () => ({
  getPrisma: async () => ({
    appUser: {
      findUnique: async () => state.user,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.createdUser = data;
        return { id: "new-user", ...data };
      },
    },
    appSession: {
      deleteMany: async () => undefined,
    },
  }),
}));

vi.mock("@/lib/auth", () => ({
  hashPassword: async (password: string) => `hash:${password}`,
  verifyPassword: async (password: string, passwordHash: string) => passwordHash === `hash:${password}`,
  hasValidAccountScope: (role: string, city: string | null, bdName: string | null) => role === "SUPER_ADMIN" || (role === "CITY_ADMIN" && Boolean(city)) || (role === "BD" && Boolean(city && bdName)),
  getSessionCookieOptions: () => ({ httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 7 }),
  createSession: async (userId: string) => {
    state.sessionForUserId = userId;
    return "test-session-token";
  },
  clearSession: async () => {
    state.cleared = true;
  },
  getSession: async () => state.sessionUser,
  SESSION_COOKIE_NAME: "competition_session",
}));

vi.mock("@/lib/runtime-secrets", () => ({
  getRuntimeSecret: async () => "valid-passcode",
}));

import { POST as login } from "@/app/api/auth/login/route";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as createUser } from "@/app/api/admin/users/route";
import { POST as importMasterData } from "@/app/api/admin/master-data/route";
import { safeNextPath } from "@/app/login/page";

beforeEach(() => {
  state.user = {
    id: "user-1",
    username: "张三",
    passwordHash: "hash:initial-pass",
    role: "BD",
    city: "玉林",
    bdName: "张三",
  };
  state.sessionUser = null;
  state.createdUser = undefined;
  state.sessionForUserId = undefined;
  state.cleared = false;
});

describe("login route", () => {
  it("sets a session cookie for valid BD credentials", async () => {
    const response = await login(new Request("http://test/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "张三", password: "initial-pass" }),
    }) as never);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("competition_session=");
    expect(state.sessionForUserId).toBe("user-1");
  });

  it("rejects an invalid password", async () => {
    const response = await login(new Request("http://test/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "张三", password: "not-the-password" }),
    }) as never);

    expect(response.status).toBe(401);
    expect(state.sessionForUserId).toBeUndefined();
  });

  it("returns only safe session fields from the current-user endpoint", async () => {
    state.sessionUser = { id: "user-1", username: "张三", role: "BD", city: "玉林", bdName: "张三" };

    const response = await me();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user: state.sessionUser });
  });
});

describe("login return path", () => {
  it("rejects encoded backslash and protocol-relative paths", () => {
    expect(safeNextPath("/%5Cevil.example")).toBe("/");
    expect(safeNextPath("/%5C%5Cevil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/dashboard?city=%E7%8E%89%E6%9E%97")).toBe("/dashboard?city=%E7%8E%89%E6%9E%97");
  });
});

describe("account creation route", () => {
  it("rejects a disabled role value", async () => {
    state.sessionUser = { id: "admin-1", username: "admin", role: "SUPER_ADMIN", city: null, bdName: null };

    const response = await createUser(new Request("http://test/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ username: "disabled", password: "initial-pass", role: "DISABLED" }),
    }) as never);

    expect(response.status).toBe(400);
    expect(state.createdUser).toBeUndefined();
  });

  it("rejects a city administrator without a city", async () => {
    state.sessionUser = { id: "admin-1", username: "admin", role: "SUPER_ADMIN", city: null, bdName: null };

    const response = await createUser(new Request("http://test/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ username: "city-admin", password: "initial-pass", role: "CITY_ADMIN" }),
    }) as never);

    expect(response.status).toBe(400);
    expect(state.createdUser).toBeUndefined();
  });
});

describe("master-data import route", () => {
  function importRequest() {
    const form = new FormData();
    form.set("passcode", "valid-passcode");
    return new Request("http://test/api/admin/master-data", { method: "POST", body: form }) as never;
  }

  it("rejects an anonymous caller even with the legacy passcode", async () => {
    state.sessionUser = null;

    const response = await importMasterData(importRequest());

    expect(response.status).toBe(401);
  });

  it("rejects a BD caller even with the legacy passcode", async () => {
    state.sessionUser = { id: "user-1", username: "张三", role: "BD", city: "玉林", bdName: "张三" };

    const response = await importMasterData(importRequest());

    expect(response.status).toBe(403);
  });

  it("allows a super administrator to reach the existing import validation", async () => {
    state.sessionUser = { id: "admin-1", username: "admin", role: "SUPER_ADMIN", city: null, bdName: null };

    const response = await importMasterData(importRequest());

    expect(response.status).toBe(400);
  });
});
