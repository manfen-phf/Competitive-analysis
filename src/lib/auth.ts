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

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
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
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const prisma = await getPrisma();
  const session = await prisma.appSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date()) return null;

  return {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
    city: session.user.city,
    bdName: session.user.bdName,
  };
}

export async function ensureBootstrapSuperAdmin() {
  const prisma = await getPrisma();
  if (await prisma.appUser.count()) return;

  const [username, password] = await Promise.all([
    getRuntimeSecret("SUPER_ADMIN_BOOTSTRAP_USERNAME"),
    getRuntimeSecret("SUPER_ADMIN_BOOTSTRAP_PASSWORD"),
  ]);
  if (!username || !password) return;

  await prisma.appUser.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      role: "SUPER_ADMIN",
    },
  });
}
