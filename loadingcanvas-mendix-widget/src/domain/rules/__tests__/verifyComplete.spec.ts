import { describe, expect, it } from "@jest/globals";
import { getExpectedUnitCount, isLoadingComplete } from "../validationRules";
import type { CargoItem } from "../../../core/types/viewModels/CargoItem";

const makeCargo = (id: string, quantity?: number): CargoItem => ({
  id,
  name: id,
  x: 0,
  y: 0,
  length: 120,
  width: 80,
  rotation: 0,
  type: "pallet",
  color: "orange",
  isLocked: false,
  ...(quantity === undefined ? {} : { quantity }),
});

describe("verify counts (BR-40)", () => {
  it("sums quantities across orders instead of counting orders", () => {
    const cargo = [makeCargo("cargo-A", 4), makeCargo("cargo-B", 1), makeCargo("cargo-C", 2)];

    expect(getExpectedUnitCount(cargo)).toBe(7);
  });

  it("defaults a missing quantity to one unit", () => {
    expect(getExpectedUnitCount([makeCargo("cargo-A")])).toBe(1);
    expect(getExpectedUnitCount([])).toBe(0);
  });

  it("passes only when every unit is placed and the list is empty", () => {
    const cargo = [makeCargo("cargo-A", 3), makeCargo("cargo-B", 2)];

    expect(isLoadingComplete(cargo, 5, 0)).toBe(true);
  });

  it("fails on a partial load even when the counts differ", () => {
    const cargo = [makeCargo("cargo-A", 3), makeCargo("cargo-B", 2)];

    expect(isLoadingComplete(cargo, 3, 2)).toBe(false);
  });

  it("fails when the count matches but the list is not empty", () => {
    const cargo = [makeCargo("cargo-A", 3), makeCargo("cargo-B", 2)];

    expect(isLoadingComplete(cargo, 5, 1)).toBe(false);
  });
});
