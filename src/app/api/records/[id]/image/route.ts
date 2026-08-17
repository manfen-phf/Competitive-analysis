import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import { NextResponse } from "next/server";
import { readManagementImage } from "@/lib/management-image";
import type { ScreenshotBucket } from "@/lib/r2-storage";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { env } = await getCloudflareContext({ async: true });
    const bindings = env as { DB?: D1Database; SCREENSHOT_BUCKET?: ScreenshotBucket };
    if (!bindings.DB || !bindings.SCREENSHOT_BUCKET) throw new Error("Cloudflare storage bindings are required");
    const image = await readManagementImage(bindings.DB, bindings.SCREENSHOT_BUCKET, id);
    return new Response(image.bytes, { headers: { "Content-Type": image.contentType, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Source image is unavailable";
    const status = message === "Upload image not found" || message === "Source image not found in R2" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
