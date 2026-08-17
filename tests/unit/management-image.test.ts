import { describe, expect, it } from "vitest";
import { readManagementImage } from "../../src/lib/management-image";

describe("management source image", () => {
  it("reads the original image from R2 using the upload metadata kept in D1", async () => {
    const bytes = new TextEncoder().encode("source-image").buffer;
    const db = {
      prepare: () => ({
        bind: () => ({ first: async () => ({ r2Key: "screenshots/aa/file.jpg", imageMimeType: "image/jpeg" }) }),
      }),
    };
    const bucket = { get: async (key: string) => key === "screenshots/aa/file.jpg" ? { arrayBuffer: async () => bytes } : null };

    const image = await readManagementImage(db as never, bucket as never, "upload-1");

    expect(image.contentType).toBe("image/jpeg");
    expect(new TextDecoder().decode(image.bytes)).toBe("source-image");
  });

  it("does not expose an image when its upload record does not exist", async () => {
    const db = { prepare: () => ({ bind: () => ({ first: async () => null }) }) };
    const bucket = { get: async () => null };
    await expect(readManagementImage(db as never, bucket as never, "missing")).rejects.toThrow("Upload image not found");
  });
});
