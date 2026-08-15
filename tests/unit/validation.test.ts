import { describe, expect, it } from "vitest";
import { validateRecognition } from "../../src/lib/validation";

describe("validateRecognition", () => {
  it("accepts a goods total with all optional screenshot fields absent", () => {
    expect(validateRecognition({ platform: "MEITUAN", goodsTotal: 50 }).ok).toBe(true);
  });

  it("rejects the one mandatory screenshot field when it is missing", () => {
    expect(validateRecognition({ platform: "MEITUAN" }).ok).toBe(false);
  });

  it("rejects an invalid monetary value when a field is provided", () => {
    expect(validateRecognition({ platform: "MEITUAN", goodsTotal: 50, packagingFee: -1 }).ok).toBe(false);
  });
});
