import { describe, it, expect } from "@jest/globals";
import { meterToPixel, pixelToMeter } from "../coordinates";

describe("coordinateRules", () => {
  describe("meterToPixel", () => {
    it("should convert meters to pixels with scale 1", () => {
      expect(meterToPixel(5, 1)).toBe(5);
    });

    it("should convert meters to pixels with scale 20", () => {
      expect(meterToPixel(5, 20)).toBe(100);
    });

    it("should handle zero meters", () => {
      expect(meterToPixel(0, 20)).toBe(0);
    });

    it("should handle fractional meters", () => {
      expect(meterToPixel(2.5, 20)).toBe(50);
    });
  });

  describe("pixelToMeter", () => {
    it("should convert pixels to meters with scale 1", () => {
      expect(pixelToMeter(5, 1)).toBe(5);
    });

    it("should convert pixels to meters with scale 20", () => {
      expect(pixelToMeter(100, 20)).toBe(5);
    });

    it("should handle zero pixels", () => {
      expect(pixelToMeter(0, 20)).toBe(0);
    });

    it("should be the inverse of meterToPixel", () => {
      const meters = 3.5;
      const scale = 20;
      const pixels = meterToPixel(meters, scale);
      expect(pixelToMeter(pixels, scale)).toBeCloseTo(meters);
    });
  });
});
