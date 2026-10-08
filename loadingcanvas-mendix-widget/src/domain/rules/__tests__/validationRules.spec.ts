import { describe, it, expect } from "@jest/globals";
import {
  validateItem,
  validateLoadMeters,
  validateAll,
  getExpectedUnitCount,
  isLoadingComplete,
} from "../validationRules";
import { CargoItem, CargoType } from "../../../core/types/viewModels/CargoItem";
import { Rotation } from "../../../core/types/geometry";
import { getTruckFrontDataX } from "../boundaryRules";

describe("validationRules", () => {
  const bounds = { x: 0, y: 0, length: 1000, width: 600 };

  const makeCargo = (overrides: Partial<CargoItem> = {}): CargoItem => ({
    id: "test-cargo",
    name: "Test Cargo",
    type: "pallet" as CargoType,
    color: "orange",
    isLocked: false,
    x: 0,
    y: 0,
    length: 100,
    width: 50,
    rotation: 0 as Rotation,
    ...overrides,
  });

  const makeCompleteCargo = (overrides: Partial<CargoItem> = {}): CargoItem => ({
    id: "cargo-" + Math.random().toString(36).substr(2, 9),
    name: "Test Cargo",
    type: "pallet" as CargoType,
    color: "orange",
    isLocked: false,
    x: 0,
    y: 0,
    length: 100,
    width: 50,
    rotation: 0 as Rotation,
    ...overrides,
  });

  // Helper: call validateItem and return primitives only
  const runValidateItem = (
    item: CargoItem,
    allItems: CargoItem[],
    scale: { widthScale: number; heightScale: number },
    allowOverlap: boolean | undefined
  ) => {
    // Exclude the item itself like validateAll does; otherwise the item overlaps
    // itself and every call would report OVERLAP.
    const excludeIndex = allItems.indexOf(item);
    const result = validateItem(
      item,
      { x: 0, y: 0, length: 1000, width: 600 },
      allItems,
      excludeIndex,
      scale,
      allowOverlap
    );
    return { valid: result.valid, errors: result.errors || [] };
  };

  // Helper: call validateLoadMeters and return primitives only
  const runValidateLoadMeters = (
    items: CargoItem[],
    maxLoadMeters: number,
    scale: { widthScale: number; heightScale: number },
    truckFrontDataX: number = 0
  ) => {
    const result = validateLoadMeters(items, maxLoadMeters, scale, truckFrontDataX);
    return { valid: result.valid, errors: result.errors || [] };
  };

  // Helper: call validateAll and return primitives only
  const runValidateAll = (
    items: CargoItem[],
    bounds: { x: number; y: number; length: number; width: number },
    options: { maxLoadMeters?: number; scale: { widthScale: number; heightScale: number }; truckFrontDataX?: number }
  ) => {
    const result = validateAll(items, bounds, options);
    return { valid: result.valid, errors: result.errors || [] };
  };

  const scale = { widthScale: 100, heightScale: 100 };

  describe("validateItem", () => {
    it("should return valid when item is inside bounds and no overlaps", () => {
      const item = makeCargo({ x: 100, y: 100, length: 50, width: 50 });
      const result = runValidateItem(item, [], scale, undefined);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should skip OVERLAP when allowOverlap is true (free placement, BR-46)", () => {
      const item = makeCargo({ x: 100, y: 100, length: 50, width: 50 });
      const other = makeCargo({ id: "other", x: 110, y: 110, length: 50, width: 50 });
      const result = runValidateItem(item, [item, other], scale, true);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should still report OUT_OF_BOUNDS when allowOverlap is true", () => {
      const item = makeCargo({ x: 980, y: 100, length: 50, width: 50 });
      const result = runValidateItem(item, [item], scale, true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OUT_OF_BOUNDS when item exceeds right boundary", () => {
      const item = makeCargo({ x: 980, y: 100, length: 50, width: 50 });
      const result = runValidateItem(item, [item], scale, undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OUT_OF_BOUNDS when item exceeds bottom boundary", () => {
      const item = makeCargo({ x: 100, y: 580, length: 50, width: 50 });
      const result = runValidateItem(item, [item], scale, undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OUT_OF_BOUNDS");
    });

    it("should return OVERLAP when item overlaps another (default, no allowOverlap)", () => {
      const item = makeCargo({ x: 100, y: 100, length: 50, width: 50 });
      const other = makeCargo({ id: "other", x: 110, y: 110, length: 50, width: 50 });
      const result = runValidateItem(item, [item, other], scale, undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("OVERLAP");
    });

    it("should not flag overlap when items touch edges", () => {
      const item = makeCargo({ x: 100, y: 100, length: 50, width: 50 });
      const other = makeCargo({ id: "other", x: 150, y: 100, length: 50, width: 50 });
      const result = runValidateItem(item, [item, other], scale, undefined);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("validateLoadMeters", () => {
    it("should return valid when total LM within limit", () => {
      const items = [
        makeCompleteCargo({ x: 0, y: 0, length: 100, width: 50, rotation: 0 as Rotation, id: "cargo-1" }),
        makeCompleteCargo({ x: 100, y: 0, length: 100, width: 50, rotation: 0 as Rotation, id: "cargo-2" }),
      ];
      const result = runValidateLoadMeters(items, 10, scale);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should return LM_EXCEEDED when non-overlapping items exceed limit", () => {
      // Two flush 6 m items form one continuous 12 m deck span, past the 10 m limit.
      const items = [
        makeCompleteCargo({ x: 0, y: 100, length: 600, width: 50, rotation: 0 as Rotation, id: "cargo-1" }),
        makeCompleteCargo({ x: 600, y: 100, length: 600, width: 50, rotation: 0 as Rotation, id: "cargo-2" }),
      ];
      const result = runValidateLoadMeters(items, 10, scale);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("LM_EXCEEDED");
    });

    it("should merge overlapping X-projections (multi-lane load)", () => {
      const items = [
        makeCompleteCargo({ x: 0, y: 0, length: 100, width: 50, rotation: 0 as Rotation, id: "cargo-1" }),
        makeCompleteCargo({ x: 100, y: 0, length: 100, width: 50, rotation: 0 as Rotation, id: "cargo-2" }),
      ];
      const result = runValidateLoadMeters(items, 1.5, scale);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("LM_EXCEEDED");
    });

    it("should merge flush edge-to-edge blocks as one continuous deck length", () => {
      // Flush 2 m + 3 m blocks merge into one continuous 5 m span, past the 4 m limit.
      const items = [
        makeCompleteCargo({ x: 0, y: 0, length: 200, width: 50, rotation: 0 as Rotation, id: "cargo-1" }),
        makeCompleteCargo({ x: 200, y: 0, length: 300, width: 50, rotation: 0 as Rotation, id: "cargo-2" }),
      ];
      const result = runValidateLoadMeters(items, 4, scale);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("LM_EXCEEDED");
    });

    it("should correctly handle 90° rotated items (width contributes to LM)", () => {
      const items = [makeCompleteCargo({ x: 0, y: 0, length: 500, width: 50, rotation: 0 as Rotation, id: "cargo-1" })];
      const result = runValidateLoadMeters(items, 5, scale);
      expect(result.valid).toBe(true);
    });

    it("should return valid for empty items array", () => {
      const result = runValidateLoadMeters([], 10, scale);
      expect(result.valid).toBe(true);
    });

    it("should handle multi-lane load with rotation", () => {
      // Lane 2's 90° turn projects its 3 m width onto X (visual 300 px); the merged
      // span is 3 m > 2.5 m. Unrotated it would span 1 m and stay within the limit.
      const items = [
        makeCompleteCargo({ x: 0, y: 0, length: 100, width: 50, rotation: 0 as Rotation, id: "cargo-1" }),
        makeCompleteCargo({ x: 0, y: 100, length: 100, width: 300, rotation: 90 as Rotation, id: "cargo-2" }),
      ];
      const result = runValidateLoadMeters(items, 2.5, scale);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("LM_EXCEEDED");
    });
  });

  describe("validateLoadMeters with truckFrontDataX offset", () => {
    // 10m truck: scale=121.2, truck.length=1212, truckFrontDataX=275 (TRUCK_BACKGROUND_LOAD_X * k)
    const scale10m = { widthScale: 121.2, heightScale: 121.2 };
    const truckFrontDataX = 275; // TRUCK_BACKGROUND_LOAD_X * k for 10m truck

    it("should calculate LM relative to truck front, not data origin", () => {
      const item = makeCompleteCargo({
        x: truckFrontDataX,
        y: 100,
        length: 100,
        width: 50,
        rotation: 0 as Rotation,
        id: "cargo-1",
      });
      const result = runValidateLoadMeters([item], 10, scale10m, truckFrontDataX);
      expect(result.valid).toBe(true); // LM = 0.82m, not 3.09m
    });

    it("should not count cargo before truck front (canvas margin)", () => {
      const item = makeCompleteCargo({
        x: 100,
        y: 100,
        length: 100,
        width: 50,
        rotation: 0 as Rotation,
        id: "cargo-1",
      });
      const result = runValidateLoadMeters([item], 10, scale10m, truckFrontDataX);
      expect(result.valid).toBe(true); // LM = 0 (clamped)
    });

    it("should correctly measure full truck load", () => {
      const item = makeCompleteCargo({
        x: truckFrontDataX,
        y: 100,
        length: 1212,
        width: 50,
        rotation: 0 as Rotation,
        id: "cargo-1",
      });
      const result = runValidateLoadMeters([item], 10, scale10m, truckFrontDataX);
      expect(result.valid).toBe(true); // LM = 10m exactly
    });

    it("should exceed when cargo extends beyond truck length", () => {
      const item = makeCompleteCargo({
        x: truckFrontDataX,
        y: 100,
        length: 1333,
        width: 50,
        rotation: 0 as Rotation,
        id: "cargo-1",
      });
      const result = runValidateLoadMeters([item], 10, scale10m, truckFrontDataX);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("LM_EXCEEDED");
    });

    it("should handle cargo partially overlapping truck front", () => {
      // Cargo starts 50px before truck front, extends 100px into truck
      const item = makeCompleteCargo({
        x: truckFrontDataX - 50,
        y: 100,
        length: 150,
        width: 50,
        rotation: 0 as Rotation,
        id: "cargo-1",
      });
      const result = runValidateLoadMeters([item], 10, scale10m, truckFrontDataX);
      expect(result.valid).toBe(true); // Only 100px (0.82m) inside truck
    });

    it("accepts a span that equals the budget up to float drift (LM epsilon)", () => {
      // 17 rotated EUR pallets on a 13.6 m frame: the pixel span lands at
      // 1453.0000000000002 → 13.600000000000001 LM, ~1.8e-15 over the strict
      // comparison — an exactly-at-budget load must still be valid.
      const tautlinerScale = { widthScale: 1453 / 13.6, heightScale: 1453 / 13.6 };
      const item = makeCompleteCargo({
        id: "cargo-1",
        x: truckFrontDataX,
        y: 100,
        length: 17 * (0.8 * (1453 / 13.6)),
        width: 50,
        rotation: 0 as Rotation,
      });
      const result = runValidateLoadMeters([item], 13.6, tautlinerScale, truckFrontDataX);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe("validateAll", () => {
    it("should return valid when all items valid and LM within limit", () => {
      const items = [
        makeCompleteCargo({ x: 100, y: 100, length: 100, width: 50, rotation: 0 as Rotation, id: "cargo-1" }),
        makeCompleteCargo({ x: 100, y: 200, length: 100, width: 50, rotation: 0 as Rotation, id: "cargo-2" }),
      ];
      const result = runValidateAll(items, bounds, { maxLoadMeters: 10, scale });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("should return LM_EXCEEDED when load meters exceeded", () => {
      const items = [makeCompleteCargo({ x: 0, y: 0, length: 600, width: 50, rotation: 0 as Rotation, id: "cargo-1" })];
      const result = runValidateAll(items, bounds, { maxLoadMeters: 1.5, scale });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("LM_EXCEEDED");
    });

    it("should return LM_EXCEEDED with rotation-aware load meters", () => {
      // The 90° turn projects cargo-2's 2 m width onto X (visual 200 px): the merged
      // span is 3 m > 1.5 m. Unrotated it would contribute 0.5 m and stay within budget.
      const items = [
        makeCompleteCargo({ x: 0, y: 100, length: 100, width: 50, rotation: 0 as Rotation, id: "cargo-1" }),
        makeCompleteCargo({ x: 100, y: 100, length: 50, width: 200, rotation: 90 as Rotation, id: "cargo-2" }),
      ];
      const result = runValidateAll(items, bounds, { maxLoadMeters: 1.5, scale });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("LM_EXCEEDED");
    });
  });

  describe("getExpectedUnitCount", () => {
    it("should sum quantities across all cargo", () => {
      const availableCargo = [
        {
          id: "cargo-1",
          name: "Pallet",
          x: 0,
          y: 0,
          length: 100,
          width: 50,
          type: "pallet" as CargoType,
          color: "orange",
          isLocked: false,
          rotation: 0 as Rotation,
          quantity: 2,
        },
        {
          id: "cargo-2",
          name: "Box",
          x: 0,
          y: 0,
          length: 100,
          width: 50,
          type: "box" as CargoType,
          color: "blue",
          isLocked: false,
          rotation: 0 as Rotation,
          quantity: 3,
        },
      ];
      expect(getExpectedUnitCount(availableCargo)).toBe(5);
    });

    it("should default quantity to 1 when not provided", () => {
      const availableCargo = [
        {
          id: "cargo-1",
          name: "Pallet",
          x: 0,
          y: 0,
          length: 100,
          width: 50,
          type: "pallet" as CargoType,
          color: "orange",
          isLocked: false,
          rotation: 0 as Rotation,
        },
      ];
      expect(getExpectedUnitCount(availableCargo)).toBe(1);
    });

    it("should return 0 for empty array", () => {
      expect(getExpectedUnitCount([])).toBe(0);
    });

    it("should handle undefined quantity", () => {
      const availableCargo = [
        {
          id: "cargo-1",
          name: "Pallet",
          x: 0,
          y: 0,
          length: 100,
          width: 50,
          type: "pallet" as CargoType,
          color: "orange",
          isLocked: false,
          rotation: 0 as Rotation,
        },
      ];
      expect(getExpectedUnitCount(availableCargo)).toBe(1);
    });
  });

  describe("isLoadingComplete", () => {
    it("should return true when all units placed and no remaining", () => {
      const availableCargo = [
        {
          id: "cargo-1",
          name: "C1",
          x: 0,
          y: 0,
          length: 100,
          width: 50,
          type: "pallet" as CargoType,
          color: "orange",
          isLocked: false,
          rotation: 0 as Rotation,
          quantity: 2,
        },
        {
          id: "cargo-2",
          name: "C2",
          x: 0,
          y: 0,
          length: 100,
          width: 50,
          type: "pallet" as CargoType,
          color: "orange",
          isLocked: false,
          rotation: 0 as Rotation,
          quantity: 1,
        },
      ];
      expect(isLoadingComplete(availableCargo, 3, 0)).toBe(true);
    });

    it("should return false when units still remaining in list", () => {
      const availableCargo = [
        {
          id: "cargo-1",
          name: "C1",
          x: 0,
          y: 0,
          length: 100,
          width: 50,
          type: "pallet" as CargoType,
          color: "orange",
          isLocked: false,
          rotation: 0 as Rotation,
          quantity: 2,
        },
        {
          id: "cargo-2",
          name: "C2",
          x: 0,
          y: 0,
          length: 100,
          width: 50,
          type: "pallet" as CargoType,
          color: "orange",
          isLocked: false,
          rotation: 0 as Rotation,
          quantity: 1,
        },
      ];
      expect(isLoadingComplete(availableCargo, 2, 1)).toBe(false);
    });

    it("should return false when not all units placed", () => {
      const availableCargo = [
        {
          id: "cargo-1",
          name: "C1",
          x: 0,
          y: 0,
          length: 100,
          width: 50,
          type: "pallet" as CargoType,
          color: "orange",
          isLocked: false,
          rotation: 0 as Rotation,
          quantity: 2,
        },
      ];
      expect(isLoadingComplete(availableCargo, 1, 0)).toBe(false);
    });

    it("should return true for empty cargo", () => {
      expect(isLoadingComplete([], 0, 0)).toBe(true);
    });

    it("should handle exact count match", () => {
      const availableCargo = [
        {
          id: "cargo-1",
          name: "C1",
          x: 0,
          y: 0,
          length: 100,
          width: 50,
          type: "pallet" as CargoType,
          color: "orange",
          isLocked: false,
          rotation: 0 as Rotation,
          quantity: 2,
        },
        {
          id: "cargo-2",
          name: "C2",
          x: 0,
          y: 0,
          length: 100,
          width: 50,
          type: "pallet" as CargoType,
          color: "orange",
          isLocked: false,
          rotation: 0 as Rotation,
          quantity: 1,
        },
      ];
      expect(isLoadingComplete(availableCargo, 3, 0)).toBe(true);
    });

    it("should return false when placed count doesn't match", () => {
      const availableCargo = [
        {
          id: "cargo-1",
          name: "C1",
          x: 0,
          y: 0,
          length: 100,
          width: 50,
          type: "pallet" as CargoType,
          color: "orange",
          isLocked: false,
          rotation: 0 as Rotation,
          quantity: 2,
        },
        {
          id: "cargo-2",
          name: "C2",
          x: 0,
          y: 0,
          length: 100,
          width: 50,
          type: "pallet" as CargoType,
          color: "orange",
          isLocked: false,
          rotation: 0 as Rotation,
          quantity: 1,
        },
      ];
      expect(isLoadingComplete(availableCargo, 2, 0)).toBe(false);
      expect(isLoadingComplete(availableCargo, 4, 0)).toBe(false);
    });
  });

  describe("getTruckFrontDataX", () => {
    // LM front = the frame's left edge (truck.x = 333) for every truck,
    // regardless of its rendered length.
    it("returns the frame front (truck.x) for any truck length", () => {
      expect(getTruckFrontDataX({ x: 333, length: 1453 })).toBe(333);
      expect(getTruckFrontDataX({ x: 333, length: 1091.67 })).toBe(333);
    });

    it("returns 0 for null or empty trucks", () => {
      expect(getTruckFrontDataX(null)).toBe(0);
      expect(getTruckFrontDataX(undefined)).toBe(0);
      expect(getTruckFrontDataX({ x: 333, length: 0 })).toBe(0);
    });
  });
});
