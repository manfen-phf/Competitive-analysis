import { describe, expect, it } from "vitest";
import { createBdSessionValue, readBdSessionValue } from "@/lib/bd-session";

describe("BD signed session", () => {
  it("returns the original BD identity when a session token is verified", async () => {
    const token = await createBdSessionValue({ userId: "bd:刘英安", displayName: "刘英安" }, "test-signing-secret");

    await expect(readBdSessionValue(token, "test-signing-secret")).resolves.toEqual({
      userId: "bd:刘英安",
      displayName: "刘英安",
    });
  });

  it("rejects a session token after its payload is altered", async () => {
    const token = await createBdSessionValue({ userId: "bd:刘英安", displayName: "刘英安" }, "test-signing-secret");
    const [payload, signature] = token.split(".");

    await expect(readBdSessionValue(`${payload}x.${signature}`, "test-signing-secret")).resolves.toBeNull();
  });
});
