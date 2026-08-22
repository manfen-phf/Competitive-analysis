import { describe, expect, it } from "vitest";
import { validateCollectionForConfirmation } from "@/lib/collections";

const baseDraft = {
  merchantId: "m-001",
  city: "玉林",
  bdName: "张三",
  originalDeliveryFee: 5,
};

describe("validateCollectionForConfirmation", () => {
  it("rejects confirmation when either platform lacks a successful image", () => {
    expect(validateCollectionForConfirmation({
      ...baseDraft,
      images: [{
        platform: "MEITUAN",
        recognitionStatus: "SUCCEEDED",
        recognitionResult: { goodsTotal: 28 },
      }],
    })).toEqual({
      ok: false,
      fieldErrors: {
        B_JIA: { image: "请上传B家订单截图" },
      },
    });
  });

  it("requires goods total from each successful platform image", () => {
    expect(validateCollectionForConfirmation({
      ...baseDraft,
      images: [
        {
          platform: "MEITUAN",
          recognitionStatus: "SUCCEEDED",
          recognitionResult: { goodsTotal: 28 },
        },
        {
          platform: "B_JIA",
          recognitionStatus: "SUCCEEDED",
          recognitionResult: {},
        },
      ],
    })).toEqual({
      ok: false,
      fieldErrors: {
        B_JIA: { goodsTotal: "请补充商品总价" },
      },
    });
  });

  it("accepts one successfully recognized image with goods total for each platform", () => {
    expect(validateCollectionForConfirmation({
      ...baseDraft,
      images: [
        {
          platform: "MEITUAN",
          recognitionStatus: "SUCCEEDED",
          recognitionResult: { goodsTotal: 28 },
        },
        {
          platform: "B_JIA",
          recognitionStatus: "SUCCEEDED",
          recognitionResult: { goodsTotal: 31.5 },
        },
      ],
    })).toEqual({ ok: true, fieldErrors: {} });
  });

  it("accepts a later successful retry with a goods total regardless of image order", () => {
    expect(validateCollectionForConfirmation({
      ...baseDraft,
      images: [
        {
          platform: "MEITUAN",
          recognitionStatus: "SUCCEEDED",
          recognitionResult: {},
        },
        {
          platform: "B_JIA",
          recognitionStatus: "FAILED",
          recognitionResult: null,
        },
        {
          platform: "B_JIA",
          recognitionStatus: "SUCCEEDED",
          recognitionResult: { goodsTotal: 31.5 },
        },
        {
          platform: "MEITUAN",
          recognitionStatus: "SUCCEEDED",
          recognitionResult: { goodsTotal: 28 },
        },
      ],
    })).toEqual({ ok: true, fieldErrors: {} });
  });
});
