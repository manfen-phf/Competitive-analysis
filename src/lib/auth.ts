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
let bootstrapInFlight: Promise<boolean> | undefined;

type BootstrapUser = { username: string; passwordHash: string; role: "SUPER_ADMIN" };
type D1Statement = {
  bind: (...values: string[]) => unknown;
};
type BootstrapDatabase = {
  prepare: (sql: string) => D1Statement;
  batch: (statements: any[]) => Promise<Array<{ meta?: { changes?: number } }>>;
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

export function getSessionCookieOptions() {
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
  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
  return token;
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

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required");
  }
}

export class AuthorizationError extends Error {
  constructor() {
    super("Insufficient role");
  }
}

export async function requireWorkspaceUser(allowedRoles?: readonly AppRole[]): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new AuthenticationRequiredError();
  if (allowedRoles && !allowedRoles.includes(user.role)) throw new AuthorizationError();
  return user;
}

export async function bootstrapFirstSuperAdmin(
  database: BootstrapDatabase,
  user: Pick<BootstrapUser, "username" | "passwordHash">,
) {
  const ownerToken = randomBytes(16).toString("hex");
  const sentinel = database.prepare(`
    INSERT INTO "AppBootstrap" ("id", "ownerToken")
    SELECT ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM "AppUser")
    ON CONFLICT("id") DO NOTHING
  `).bind(BOOTSTRAP_SENTINEL_ID, ownerToken);
  const firstUser = database.prepare(`
    INSERT INTO "AppUser" ("id", "username", "passwordHash", "role")
    SELECT ?, ?, ?, ?
    WHERE EXISTS (
      SELECT 1 FROM "AppBootstrap"
      WHERE "id" = ? AND "ownerToken" = ?
    )
    AND NOT EXISTS (SELECT 1 FROM "AppUser")
  `).bind(randomBytes(16).toString("hex"), user.username, user.passwordHash, "SUPER_ADMIN", BOOTSTRAP_SENTINEL_ID, ownerToken);
  const results = await database.batch([sentinel, firstUser]);

  return results[0]?.meta?.changes === 1 && results[1]?.meta?.changes === 1;
}

async function getD1BootstrapDatabase(): Promise<BootstrapDatabase | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const database = (env as { DB?: BootstrapDatabase }).DB;
    return database ?? null;
  } catch {
    return null;
  }
}

async function createBootstrapSuperAdmin() {
  const [username, password] = await Promise.all([
    getRuntimeSecret("SUPER_ADMIN_BOOTSTRAP_USERNAME"),
    getRuntimeSecret("SUPER_ADMIN_BOOTSTRAP_PASSWORD"),
  ]);
  if (!username || !password) return false;

  const database = await getD1BootstrapDatabase();
  if (!database) throw new Error("Cloudflare D1 bootstrap database is unavailable");

  return bootstrapFirstSuperAdmin(database, {
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

  return bootstrapInFlight;
}

export async function initializeAuthentication() {
  try {
    return (await ensureBootstrapSuperAdmin()) ? "initialized" : "skipped";
  } catch (error) {
    console.error("Authentication bootstrap failed", error);
    return "failed";
  }
}
