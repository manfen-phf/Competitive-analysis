import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getRuntimeSecret(name: string): Promise<string | undefined> {
  try {
    const { env } = getCloudflareContext();
    const value = (env as Record<string, unknown>)[name];
    if (typeof value === "string" && value.length > 0) return value;
  } catch {
    // Local development does not have a Cloudflare request context.
  }

  return process.env[name];
}
