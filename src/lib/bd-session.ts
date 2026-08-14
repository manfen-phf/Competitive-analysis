export type BdSession = {
  userId: string;
  displayName: string;
};

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

async function signature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Buffer.from(bytes).toString("base64url");
}

function sameValue(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function createBdSessionValue(session: BdSession, secret: string): Promise<string> {
  if (!secret) throw new Error("BD session secret is required");
  const payload = encode(JSON.stringify(session));
  return `${payload}.${await signature(payload, secret)}`;
}

export async function readBdSessionValue(value: string | undefined, secret: string): Promise<BdSession | null> {
  if (!value || !secret) return null;
  const [payload, providedSignature, ...extra] = value.split(".");
  if (!payload || !providedSignature || extra.length > 0 || !sameValue(await signature(payload, secret), providedSignature)) return null;
  const decoded = decode(payload);
  if (!decoded) return null;

  try {
    const parsed = JSON.parse(decoded) as Partial<BdSession>;
    if (typeof parsed.userId !== "string" || typeof parsed.displayName !== "string" || !parsed.userId || !parsed.displayName) return null;
    return { userId: parsed.userId, displayName: parsed.displayName };
  } catch {
    return null;
  }
}
