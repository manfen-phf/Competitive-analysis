import { describe, expect, it } from "vitest";

import { canExportCity, canMutateOrder, canReadOrder } from "@/lib/permissions";

const cityAdmin = { role: "CITY_ADMIN" as const, city: "玉林", bdName: null };
const otherCityOrder = { city: "南宁", bdName: "李四" };
const ownCityOrder = { city: "玉林", bdName: "张三" };

describe("order permissions", () => {
  it("lets a city admin read all cities but mutate and export only its city", () => {
    expect(canReadOrder(cityAdmin, otherCityOrder)).toBe(true);
    expect(canMutateOrder(cityAdmin, otherCityOrder)).toBe(false);
    expect(canMutateOrder(cityAdmin, ownCityOrder)).toBe(true);
    expect(canExportCity(cityAdmin, "南宁")).toBe(false);
    expect(canExportCity(cityAdmin, "玉林")).toBe(true);
  });

  it("limits a BD to its own orders and never lets it export", () => {
    const bd = { role: "BD" as const, city: "玉林", bdName: "张三" };

    expect(canReadOrder(bd, ownCityOrder)).toBe(true);
    expect(canMutateOrder(bd, ownCityOrder)).toBe(true);
    expect(canReadOrder(bd, otherCityOrder)).toBe(false);
    expect(canMutateOrder(bd, otherCityOrder)).toBe(false);
    expect(canExportCity(bd, "玉林")).toBe(false);
  });

  it("gives a super administrator full order and export access", () => {
    const admin = { role: "SUPER_ADMIN" as const, city: null, bdName: null };

    expect(canReadOrder(admin, otherCityOrder)).toBe(true);
    expect(canMutateOrder(admin, otherCityOrder)).toBe(true);
    expect(canExportCity(admin, "南宁")).toBe(true);
  });
});
