import { describe, it, expect } from "@jest/globals";
import { rotate90, isVerticalRotation, getRotatedScreenSize, rotateKeepingCenter } from "../rotationRules";
import type { Positionable, Rotation, Size } from "../../../core/types/geometry";

describe("rotationRules", () => {
  describe("rotate90", () => {
    it("should rotate 0 to 90", () => {
      expect(rotate90(0)).toBe(90);
    });

    it("should rotate 90 to 180", () => {
      expect(rotate90(90)).toBe(180);
    });

    it("should rotate 180 to 270", () => {
      expect(rotate90(180)).toBe(270);
    });

    it("should rotate 270 to 0 (wraps around)", () => {
      expect(rotate90(270)).toBe(0);
    });
  });

  describe("isVerticalRotation", () => {
    it("should return true for 90 degrees", () => {
      expect(isVerticalRotation(90)).toBe(true);
    });

    it("should return true for 270 degrees", () => {
      expect(isVerticalRotation(270)).toBe(true);
    });

    it("should return false for 0 degrees", () => {
      expect(isVerticalRotation(0)).toBe(false);
    });

    it("should return false for 180 degrees", () => {
      expect(isVerticalRotation(180)).toBe(false);
    });
  });

  describe("getRotatedScreenSize", () => {
    const size = { length: 100, width: 50 };

    it("should return original size for 0 degrees", () => {
      expect(getRotatedScreenSize(size, 0)).toEqual({ length: 100, width: 50 });
    });

    it("should swap length and width for 90 degrees with uniform scale", () => {
      expect(getRotatedScreenSize(size, 90)).toEqual({ length: 50, width: 100 });
    });

    it("should return original size for 180 degrees even with non-uniform scale", () => {
      expect(getRotatedScreenSize(size, 180, { widthScale: 2, heightScale: 1 })).toEqual({
        length: 100,
        width: 50,
      });
    });

    it("should swap length and width for 270 degrees with uniform scale", () => {
      expect(getRotatedScreenSize(size, 270)).toEqual({ length: 50, width: 100 });
    });

    it("should not mutate the original size object", () => {
      const original = { length: 100, width: 50 };
      getRotatedScreenSize(original, 90);
      expect(original).toEqual({ length: 100, width: 50 });
    });

    it("should handle square items (swap has no visible effect)", () => {
      const square = { length: 50, width: 50 };
      expect(getRotatedScreenSize(square, 90)).toEqual({ length: 50, width: 50 });
    });

    it("should project extents through the matching axis scale for 90 degrees", () => {
      // Real case: box 0.3m x 0.2m in a truck 13.6m x 2.45m mapped to 1453x297 px
      const scale = { widthScale: 1453 / 13.6, heightScale: 297 / 2.45 };
      const box = { length: 0.3 * scale.widthScale, width: 0.2 * scale.heightScale };

      const rotated = getRotatedScreenSize(box, 90, scale);

      expect(rotated.length).toBeCloseTo(21.367647058823533);
      expect(rotated.width).toBeCloseTo(36.36734693877551);
      // Footprint converts back to the physically rotated meters
      expect(rotated.length / scale.widthScale).toBeCloseTo(0.2);
      expect(rotated.width / scale.heightScale).toBeCloseTo(0.3);
    });

    it("should reduce to a plain swap when both scales are equal but not 1", () => {
      expect(getRotatedScreenSize(size, 90, { widthScale: 20, heightScale: 20 })).toEqual({
        length: 50,
        width: 100,
      });
    });
  });

  describe("rotateKeepingCenter", () => {
    it("should re-anchor a uniform-scaled rectangle around its shared center", () => {
      const result = rotateKeepingCenter({ x: 100, y: 100, length: 100, width: 50, rotation: 0 });
      expect(result.rotation).toBe(90);
      expect(result.x).toBe(125);
      expect(result.y).toBe(75);
    });

    it("should preserve the visual center under the default scale", () => {
      const item: Size & Positionable & { rotation: Rotation } = {
        x: 400,
        y: 200,
        length: 300,
        width: 120,
        rotation: 0,
      };
      const result = rotateKeepingCenter(item);
      const before = getRotatedScreenSize(item, item.rotation);
      const after = getRotatedScreenSize(item, result.rotation);
      expect(result.x + after.length / 2).toBeCloseTo(item.x + before.length / 2);
      expect(result.y + after.width / 2).toBeCloseTo(item.y + before.width / 2);
    });

    it("should project through axis scales for a real-world non-uniform mapping", () => {
      const scale = { widthScale: 1453 / 13.6, heightScale: 297 / 2.45 };
      const item: Size & Positionable & { rotation: Rotation } = {
        x: 10,
        y: 10,
        length: 0.3 * scale.widthScale,
        width: 0.2 * scale.heightScale,
        rotation: 0,
      };
      const result = rotateKeepingCenter(item, scale);
      const centerX = item.x + item.length / 2;
      const centerY = item.y + item.width / 2;
      const nextL = item.width * (scale.widthScale / scale.heightScale);
      const nextW = item.length * (scale.heightScale / scale.widthScale);
      expect(result.rotation).toBe(90);
      expect(result.x).toBeCloseTo(centerX - nextL / 2);
      expect(result.y).toBeCloseTo(centerY - nextW / 2);
    });

    it("should keep a square uniformly scaled item in place and wrap its rotation", () => {
      const item: Size & Positionable & { rotation: Rotation } = { x: 40, y: 60, length: 50, width: 50, rotation: 270 };
      const result = rotateKeepingCenter(item);
      expect(result.rotation).toBe(0);
      expect(result.x).toBe(40);
      expect(result.y).toBe(60);
    });
  });
});
