import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  token: undefined as string | undefined,
  cookieSet: undefined as { name: string; value: string; options: Record<string, unknown> } | undefined,
  cookieDeleted: undefined as string | undefined,
  session: undefined as {
    expiresAt: Date;
    user: { id: string; username: string; role: "SUPER_ADMIN" | "CITY_ADMIN" | "BD"; city: string | null; bdName: string | null };
  } | undefined,
  createdSession: undefined as { data: { tokenHash: string; userId: string; expiresAt: Date } } | undefined,
  deletedSessionWhere: undefined as { tokenHash: string } | undefined,
  userCount: 0,
  createdUser: undefined as { data: { username: string; passwordHash: string; role: string } } | undefined,
  bootstrapSentinelCreated: false,
  createCalls: 0,
  countCalls: 0,
  createError: undefined as unknown,
  getPrismaError: undefined as unknown,
  secrets: {} as Record<string, string | undefined>,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (state.token ? { value: state.token } : undefined),
    set: (name: string, value: string, options: Record<string, unknown>) => {
      state.cookieSet = { name, value, options };
    },
    delete: (name: string) => {
      state.cookieDeleted = name;
    },
  }),
}));

vi.mock("@/lib/db", () => ({
  getPrisma: async () => {
    if (state.getPrismaError) throw state.getPrismaError;
    const transaction = async <T,>(callback: (tx: {
      appUser: {
        count: () => Promise<number>;
        create: (input: { data: { username: string; passwordHash: string; role: string } }) => Promise<void>;
      };
      appBootstrap: { create: () => Promise<void> };
    }) => Promise<T>) => callback({
      appUser: {
        count: async () => {
          state.countCalls += 1;
          return state.userCount;
        },
        create: async (input) => {
          state.createCalls += 1;
          if (state.createError) throw state.createError;
          state.createdUser = input;
        },
      },
      appBootstrap: {
        create: async () => {
          if (state.bootstrapSentinelCreated) throw { code: "P2002" };
          state.bootstrapSentinelCreated = true;
        },
      },
    });
    return {
      $transaction: transaction,
    appSession: {
      findUnique: async () => state.session,
      create: async (input: { data: { tokenHash: string; userId: string; expiresAt: Date } }) => {
        state.createdSession = input;
      },
      deleteMany: async ({ where }: { where: { tokenHash: string } }) => {
        state.deletedSessionWhere = where;
      },
    },
    appUser: {
      count: async () => {
        state.countCalls += 1;
        return state.userCount;
      },
      create: async (input: { data: { username: string; passwordHash: string; role: string } }) => {
        state.createCalls += 1;
        if (state.createError) throw state.createError;
        state.createdUser = input;
      },
    },
    };
  },
}));

vi.mock("@/lib/runtime-secrets", () => ({
  getRuntimeSecret: async (name: string) => state.secrets[name],
}));

import {
  clearSession,
  bootstrapFirstSuperAdmin,
  createSession,
  ensureBootstrapSuperAdmin,
  getSession,
  hasValidAccountScope,
  hashPassword,
  initializeAuthentication,
  verifyPassword,
} from "@/lib/auth";

beforeEach(() => {
  state.token = undefined;
  state.cookieSet = undefined;
  state.cookieDeleted = undefined;
  state.session = undefined;
  state.createdSession = undefined;
  state.deletedSessionWhere = undefined;
  state.userCount = 0;
  state.createdUser = undefined;
  state.bootstrapSentinelCreated = false;
  state.createCalls = 0;
  state.countCalls = 0;
  state.createError = undefined;
  state.getPrismaError = undefined;
  state.secrets = {};
});

function createDurableBootstrapDatabase(options?: { failFirstUserCreate?: boolean }) {
  const database = { hasSentinel: false, users: [] as Array<{ username: string; passwordHash: string; role: string }> };
  let failFirstUserCreate = options?.failFirstUserCreate ?? false;
  let transactionQueue = Promise.resolve();

  const client = () => ({
    $transaction: <T,>(callback: (tx: {
      appUser: {
        count: () => Promise<number>;
        create: (input: { data: { username: string; passwordHash: string; role: string } }) => Promise<void>;
      };
      appBootstrap: { create: () => Promise<void> };
    }) => Promise<T>) => {
      const transaction = transactionQueue.then(async () => {
        const staged = { hasSentinel: database.hasSentinel, users: [...database.users] };
        const result = await callback({
          appUser: {
            count: async () => staged.users.length,
            create: async ({ data }) => {
              if (failFirstUserCreate) {
                failFirstUserCreate = false;
                throw new Error("simulated user insert failure");
              }
              staged.users.push(data);
            },
          },
          appBootstrap: {
            create: async () => {
              if (staged.hasSentinel) throw { code: "P2002" };
              staged.hasSentinel = true;
            },
          },
        });
        database.hasSentinel = staged.hasSentinel;
        database.users = staged.users;
        return result;
      });
      transactionQueue = transaction.then(() => undefined, () => undefined);
      return transaction;
    },
  });

  return { client, database };
}

describe("password helpers", () => {
  it("verifies the original password but rejects a different password", async () => {
    const passwordHash = await hashPassword("initial-pass");

    await expect(verifyPassword("initial-pass", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-pass", passwordHash)).resolves.toBe(false);
  });
});

describe("getSession", () => {
  it("rejects an expired stored session", async () => {
    state.token = "browser-token";
    state.session = {
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
      user: { id: "user-1", username: "张三", role: "BD", city: "玉林", bdName: "张三" },
    };

    await expect(getSession()).resolves.toBeNull();
  });

  it("returns only the safe user fields for an active session", async () => {
    state.token = "browser-token";
    state.session = {
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      user: { id: "user-1", username: "张三", role: "BD", city: "玉林", bdName: "张三" },
    };

    await expect(getSession()).resolves.toEqual({
      id: "user-1",
      username: "张三",
      role: "BD",
      city: "玉林",
      bdName: "张三",
    });
  });
});

describe("account scope validation", () => {
  it("requires both city and BD name for BD accounts", () => {
    expect(hasValidAccountScope("BD", "玉林", "张三")).toBe(true);
    expect(hasValidAccountScope("BD", null, "张三")).toBe(false);
    expect(hasValidAccountScope("BD", "玉林", null)).toBe(false);
  });
});

describe("session cookie helpers", () => {
  it("stores only a hashed token in a seven-day HTTP-only lax cookie session", async () => {
    const previousNodeEnv = Object.getOwnPropertyDescriptor(process.env, "NODE_ENV");
    Object.defineProperty(process.env, "NODE_ENV", {
      configurable: true,
      enumerable: true,
      value: "production",
      writable: true,
    });

    try {
      await createSession("user-1");
    } finally {
      if (previousNodeEnv) Object.defineProperty(process.env, "NODE_ENV", previousNodeEnv);
      else Reflect.deleteProperty(process.env, "NODE_ENV");
    }

    expect(state.createdSession?.data.userId).toBe("user-1");
    expect(state.createdSession?.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(state.createdSession?.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(state.cookieSet).toMatchObject({
      name: "competition_session",
      options: { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 7 },
    });
    expect(state.cookieSet?.value).not.toBe(state.createdSession?.data.tokenHash);
  });

  it("removes the session by the cookie token hash", async () => {
    state.token = "browser-token";

    await clearSession();

    expect(state.deletedSessionWhere).toEqual({
      tokenHash: "012632faba814fab31a2b8c82150024265be09ce4818297ac80be408025b184c",
    });
    expect(state.cookieDeleted).toBe("competition_session");
  });
});

describe("bootstrap super administrator", () => {
  it("creates the first administrator from runtime secrets only when the user table is empty", async () => {
    state.userCount = 0;
    state.secrets = {
      SUPER_ADMIN_BOOTSTRAP_USERNAME: "admin",
      SUPER_ADMIN_BOOTSTRAP_PASSWORD: "bootstrap-pass",
    };

    await ensureBootstrapSuperAdmin();

    expect(state.createdUser).toMatchObject({ data: { username: "admin", role: "SUPER_ADMIN" } });
    await expect(verifyPassword("bootstrap-pass", state.createdUser!.data.passwordHash)).resolves.toBe(true);
  });

  it("does nothing when either bootstrap secret is missing", async () => {
    state.secrets = { SUPER_ADMIN_BOOTSTRAP_USERNAME: "admin" };

    await ensureBootstrapSuperAdmin();

    expect(state.createdUser).toBeUndefined();
  });

  it("does nothing when an account already exists", async () => {
    state.userCount = 1;
    state.secrets = {
      SUPER_ADMIN_BOOTSTRAP_USERNAME: "admin",
      SUPER_ADMIN_BOOTSTRAP_PASSWORD: "bootstrap-pass",
    };

    await ensureBootstrapSuperAdmin();

    expect(state.createdUser).toBeUndefined();
  });

  it("coalesces concurrent bootstrap initialization into one create", async () => {
    state.secrets = {
      SUPER_ADMIN_BOOTSTRAP_USERNAME: "admin",
      SUPER_ADMIN_BOOTSTRAP_PASSWORD: "bootstrap-pass",
    };

    await Promise.all([ensureBootstrapSuperAdmin(), ensureBootstrapSuperAdmin()]);

    expect(state.createCalls).toBe(1);
  });

  it("treats a concurrent unique-username insert as an already-completed bootstrap", async () => {
    state.secrets = {
      SUPER_ADMIN_BOOTSTRAP_USERNAME: "admin",
      SUPER_ADMIN_BOOTSTRAP_PASSWORD: "bootstrap-pass",
    };
    state.createError = { code: "P2002" };

    await expect(ensureBootstrapSuperAdmin()).resolves.toBeUndefined();
  });

  it("allows only one of two independent instances to acquire a durable bootstrap sentinel", async () => {
    const durable = createDurableBootstrapDatabase();

    await Promise.all([
      bootstrapFirstSuperAdmin(durable.client(), { username: "admin-a", passwordHash: "hash-a" }),
      bootstrapFirstSuperAdmin(durable.client(), { username: "admin-b", passwordHash: "hash-b" }),
    ]);

    expect(durable.database.hasSentinel).toBe(true);
    expect(durable.database.users).toHaveLength(1);
    expect(durable.database.users[0]?.role).toBe("SUPER_ADMIN");
  });

  it("rolls back the sentinel when its first user insert fails", async () => {
    const durable = createDurableBootstrapDatabase({ failFirstUserCreate: true });

    await expect(bootstrapFirstSuperAdmin(durable.client(), { username: "admin-a", passwordHash: "hash-a" })).rejects.toThrow("simulated user insert failure");
    expect(durable.database.hasSentinel).toBe(false);

    await expect(bootstrapFirstSuperAdmin(durable.client(), { username: "admin-b", passwordHash: "hash-b" })).resolves.toBe(true);
    expect(durable.database.users).toHaveLength(1);
  });
});

describe("authentication initialization", () => {
  it("does not fail the application request when bootstrap dependencies are unavailable", async () => {
    state.getPrismaError = new Error("database unavailable");

    await expect(initializeAuthentication()).resolves.toBeUndefined();
  });
});
