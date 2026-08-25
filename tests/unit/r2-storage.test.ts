import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  bucket: undefined as undefined | {
    put: (key: string, value: Buffer, options: { httpMetadata: { contentType: string } }) => Promise<unknown>;
    get: (key: string) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer> } | null>;
  },
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({ env: { SCREENSHOTS: state.bucket } }),
}));

import { readScreenshotFromR2, saveScreenshotToR2 } from "@/lib/r2-storage";

describe("R2 screenshot storage", () => {
  const hash = "ab" + "c".repeat(62);

  beforeEach(() => {
    state.bucket = undefined;
  });

  it("persists a hash-addressed screenshot and returns its R2 key", async () => {
    const put = vi.fn(async () => undefined);
    state.bucket = { put, get: async () => null };

    await expect(saveScreenshotToR2(Buffer.from([1, 2]), "image/png", hash)).resolves.toBe(`uploads/ab/${hash}.png`);
    expect(put).toHaveBeenCalledWith(`uploads/ab/${hash}.png`, Buffer.from([1, 2]), { httpMetadata: { contentType: "image/png" } });
  });

  it("reads a stored screenshot by its D1 image key", async () => {
    state.bucket = {
      put: async () => undefined,
      get: async (key) => key === "uploads/ab/image.png" ? { arrayBuffer: async () => Uint8Array.from([3, 4]).buffer } : null,
    };

    await expect(readScreenshotFromR2("uploads/ab/image.png")).resolves.toEqual(Buffer.from([3, 4]));
  });
});
