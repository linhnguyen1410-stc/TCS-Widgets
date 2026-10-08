import { describe, it, expect } from "@jest/globals";
import { snapToGrid, snapPosition } from "../snapRules";

describe("snapRules", () => {
  describe("snapToGrid", () => {
    it("should snap to nearest grid multiple", () => {
      expect(snapToGrid(25, 20)).toBe(20);
      expect(snapToGrid(35, 20)).toBe(40);
    });

    it("should snap exact grid values to themselves", () => {
      expect(snapToGrid(0, 20)).toBe(0);
      expect(snapToGrid(20, 20)).toBe(20);
      expect(snapToGrid(40, 20)).toBe(40);
      expect(snapToGrid(100, 20)).toBe(100);
    });

    it("should handle values exactly halfway between grid points", () => {
      // Math.round rounds 0.5 up (toward positive infinity)
      expect(snapToGrid(30, 20)).toBe(40);
      expect(snapToGrid(10, 20)).toBe(20);
    });

    it("should return value unchanged when gridSize is 0", () => {
      expect(snapToGrid(25, 0)).toBe(25);
    });

    it("should return value unchanged when gridSize is negative", () => {
      expect(snapToGrid(25, -5)).toBe(25);
    });

    it("should handle negative values", () => {
      expect(snapToGrid(-25, 20)).toBe(-20);
      expect(snapToGrid(-35, 20)).toBe(-40);
    });

    it("should handle floating point grid sizes", () => {
      expect(snapToGrid(3.7, 0.5)).toBe(3.5);
      expect(snapToGrid(3.8, 0.5)).toBe(4);
    });
  });

  describe("snapPosition", () => {
    it("should snap both x and y coordinates", () => {
      const result = snapPosition(25, 35, 20);
      expect(result).toEqual({ x: 20, y: 40 });
    });

    it("should snap exact grid positions to themselves", () => {
      const result = snapPosition(40, 60, 20);
      expect(result).toEqual({ x: 40, y: 60 });
    });

    it("should handle zero grid size", () => {
      const result = snapPosition(25, 35, 0);
      expect(result).toEqual({ x: 25, y: 35 });
    });

    it("should handle negative coordinates", () => {
      const result = snapPosition(-25, -35, 20);
      expect(result).toEqual({ x: -20, y: -40 });
    });
  });
});
