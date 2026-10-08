import { describe, it, expect } from "@jest/globals";
import { clamp, getCanvasBounds, getTruckBounds, getTruckBoundsFromItem } from "../boundaryRules";

describe("boundaryRules", () => {
  describe("clamp", () => {
    it("should return the value when within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it("should return min when value is below range", () => {
      expect(clamp(-3, 0, 10)).toBe(0);
    });

    it("should return max when value is above range", () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("should return value when equal to min", () => {
      expect(clamp(0, 0, 10)).toBe(0);
    });

    it("should return value when equal to max", () => {
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it("should handle negative ranges", () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });

    it("should handle floating point values", () => {
      expect(clamp(3.14, 0, 10)).toBe(3.14);
      expect(clamp(-1.5, 0, 10)).toBe(0);
      expect(clamp(10.01, 0, 10)).toBe(10);
    });
  });

  describe("getCanvasBounds", () => {
    it("should build a zero-origin rect from canvas dimensions", () => {
      expect(getCanvasBounds(1800, 600)).toEqual({ x: 0, y: 0, length: 1800, width: 600 });
    });
  });

  describe("getTruckBounds", () => {
    it("should match the truck collision band used by DragEngine", () => {
      expect(getTruckBounds()).toEqual({ x: 333, y: 152, length: 1453, width: 297 });
    });
  });

  describe("getTruckBoundsFromItem", () => {
    it("should return the truck item's own bounds", () => {
      const truck = { x: 333, y: 170, length: 1453, width: 262 };
      expect(getTruckBoundsFromItem(truck)).toEqual({ x: 333, y: 170, length: 1453, width: 262 });
    });

    it("should fall back to the reserved band when truck is null", () => {
      expect(getTruckBoundsFromItem(null)).toEqual(getTruckBounds());
    });

    it("should fall back to the reserved band when truck is undefined", () => {
      expect(getTruckBoundsFromItem(undefined)).toEqual(getTruckBounds());
    });
  });
});
