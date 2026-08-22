import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { cookies } from "next/headers";

import { getPrisma } from "@/lib/db";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

export type AppRole = "SUPER_ADMIN" | "CITY_ADMIN" | "BD";

export type SessionUser = {
  id: string;
  username: string;
  role: AppRole;
  city: string | null;
  bdName: string | null;
};

export const SESSION_COOKIE_NAME = "competition_session";

const PASSWORD_KEY_LENGTH = 64;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const scrypt = promisify(scryptCallback);
const BOOTSTRAP_SENTINEL_ID = "first-super-admin";
let bootstrapInFlight: Promise<void> | undefined;

type BootstrapUser = { username: string; passwordHash: string; role: "SUPER_ADMIN" };
type BootstrapTransaction = {
  appUser: {
    count: () => Promise<number>;
    create: (input: { data: BootstrapUser }) => Promise<unknown>;
  };
  appBootstrap: {
    create: (input: { data: { id: string } }) => Promise<unknown>;
  };
};
type BootstrapDatabase = {
  $transaction: <T>(operation: (transaction: BootstrapTransaction) => Promise<T>) => Promise<T>;
};

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hasValidAccountScope(role: string, city: string | null, bdName: string | null) {
  if (role === "CITY_ADMIN") return Boolean(city?.trim());
  if (role === "BD") return Boolean(city?.trim() && bdName?.trim());
  return role === "SUPER_ADMIN";
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [saltHex, keyHex] = passwordHash.split(":");
  if (!saltHex || !keyHex || !/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(keyHex)) return false;

  const salt = Buffer.from(saltHex, "hex");
  const storedKey = Buffer.from(keyHex, "hex");
  if (salt.length !== 16 || storedKey.length !== PASSWORD_KEY_LENGTH) return false;

  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return timingSafeEqual(storedKey, derivedKey);
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const prisma = await getPrisma();

  await prisma.appSession.create({
    data: { tokenHash: hashSessionToken(token), userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const prisma = await getPrisma();
    await prisma.appSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  await ensureBootstrapSuperAdmin();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const prisma = await getPrisma();
  const session = await prisma.appSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date() || !hasValidAccountScope(session.user.role, session.user.city, session.user.bdName)) return null;

  return {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
    city: session.user.city,
    bdName: session.user.bdName,
  };
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function bootstrapFirstSuperAdmin(
  database: BootstrapDatabase,
  user: Pick<BootstrapUser, "username" | "passwordHash">,
) {
  try {
    return await database.$transaction(async (transaction) => {
      if (await transaction.appUser.count()) return false;

      await transaction.appBootstrap.create({ data: { id: BOOTSTRAP_SENTINEL_ID } });
      await transaction.appUser.create({ data: { ...user, role: "SUPER_ADMIN" } });
      return true;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) return false;
    throw error;
  }
}

async function createBootstrapSuperAdmin() {
  const prisma = await getPrisma();

  const [username, password] = await Promise.all([
    getRuntimeSecret("SUPER_ADMIN_BOOTSTRAP_USERNAME"),
    getRuntimeSecret("SUPER_ADMIN_BOOTSTRAP_PASSWORD"),
  ]);
  if (!username || !password) return;

  await bootstrapFirstSuperAdmin(prisma as unknown as BootstrapDatabase, {
    username,
    passwordHash: await hashPassword(password),
  });
}

export async function ensureBootstrapSuperAdmin() {
  if (!bootstrapInFlight) {
    bootstrapInFlight = createBootstrapSuperAdmin().finally(() => {
      bootstrapInFlight = undefined;
    });
  }

  await bootstrapInFlight;
}

export async function initializeAuthentication() {
  try {
    await ensureBootstrapSuperAdmin();
  } catch {
    // Requests remain available while the database or runtime bindings initialize.
  }
}
