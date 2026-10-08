import { describe, it, expect } from "@jest/globals";
import { getCanvasPoint, getClickAddDataPoint, getDropDataPoint, isPointInRect, toDataPoint } from "../coordinateRule";
import type { Size } from "../../../core/types/geometry";

describe("coordinateRule", () => {
  describe("getCanvasPoint", () => {
    it("should return {0,0} when canvas is null", () => {
      const result = getCanvasPoint(null, 100, 200);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("should convert client coordinates to canvas-relative coordinates", () => {
      const canvas = document.createElement("div");
      canvas.getBoundingClientRect = () => ({
        left: 100,
        top: 50,
        right: 1100,
        bottom: 650,
        width: 1000,
        height: 600,
        x: 100,
        y: 50,
        toJSON: () => {},
      });
      const result = getCanvasPoint(canvas, 250, 300);
      expect(result).toEqual({ x: 150, y: 250 });
    });

    it("should return client coordinates when canvas is at origin", () => {
      const canvas = document.createElement("div");
      canvas.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 600,
        width: 1000,
        height: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      const result = getCanvasPoint(canvas, 500, 300);
      expect(result).toEqual({ x: 500, y: 300 });
    });

    it("should handle negative client coordinates", () => {
      const canvas = document.createElement("div");
      canvas.getBoundingClientRect = () => ({
        left: 100,
        top: 100,
        right: 1100,
        bottom: 700,
        width: 1000,
        height: 600,
        x: 100,
        y: 100,
        toJSON: () => {},
      });
      const result = getCanvasPoint(canvas, 50, 80);
      expect(result).toEqual({ x: -50, y: -20 });
    });
  });
});

describe("getDropDataPoint", () => {
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 600;
  const SIZE: Size = { length: 100, width: 50 };

  const makeCanvas = (left = 100, top = 50) => {
    const canvas = document.createElement("div");
    canvas.getBoundingClientRect = () => ({
      left,
      top,
      right: left + CANVAS_WIDTH,
      bottom: top + CANVAS_HEIGHT,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      x: left,
      y: top,
      toJSON: () => {},
    });
    return canvas;
  };

  it("should return origin when canvas is null", () => {
    const result = getDropDataPoint(100, 200, null, { x: 80, y: 40 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("should subtract a positive scene offset from the unclamped position", () => {
    const result = getDropDataPoint(300, 250, makeCanvas(), { x: 80, y: 40 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);
    expect(result).toEqual({ x: 120, y: 160 });
  });

  it("should subtract a negative scene offset", () => {
    const result = getDropDataPoint(300, 250, makeCanvas(), { x: -50, y: -30 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);
    expect(result).toEqual({ x: 250, y: 230 });
  });

  it("should keep coordinates unchanged with a zero scene offset", () => {
    const result = getDropDataPoint(300, 250, makeCanvas(), { x: 0, y: 0 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);
    expect(result).toEqual({ x: 200, y: 200 });
  });

  it("should clamp the rendered position at the right edge before subtracting the offset", () => {
    // Drop at client 1005 → relative 905, clamped to 1000-100 = 900; minus offset 80 → 820.
    const result = getDropDataPoint(1005, 300, makeCanvas(), { x: 80, y: 40 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);
    expect(result).toEqual({ x: 820, y: 210 });
  });

  it("should clamp the rendered position at the bottom edge before subtracting the offset", () => {
    // Drop at client 655 → relative 605, clamped to 600-50 = 550; minus offset 40 → 510.
    const result = getDropDataPoint(300, 655, makeCanvas(), { x: 80, y: 40 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);
    expect(result).toEqual({ x: 120, y: 510 });
  });

  it("should clamp the rendered position to the top-left when the drop is before the origin", () => {
    // Drop at client (50, 20) → rendered (-50, -30), clamped to (0, 0); minus offset.
    const result = getDropDataPoint(50, 20, makeCanvas(), { x: 80, y: 40 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);
    expect(result).toEqual({ x: -80, y: -40 });
  });

  it("should leave the position unclamped at the exact-fit boundary", () => {
    // Client (1000, 600) → relative (900, 550) = (W-length, H-width): exactly at the boundary.
    const result = getDropDataPoint(1000, 600, makeCanvas(), { x: 0, y: 0 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);
    expect(result).toEqual({ x: 900, y: 550 });
  });

  it("should place an oversized item at the clamped origin", () => {
    const oversize: Size = { length: 1200, width: 700 };
    const result = getDropDataPoint(500, 300, makeCanvas(), { x: 0, y: 0 }, oversize, CANVAS_WIDTH, CANVAS_HEIGHT);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("should preserve the grab anchor so center-grab and corner-grab differ by the grab delta", () => {
    // Same cursor (300, 250) -> rendered (200, 200); corner grab lands top-left at
    // cursor, center grab (30, 20) shifts the card back by the grab offset.
    const corner = getDropDataPoint(300, 250, makeCanvas(), { x: 0, y: 0 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);
    const center = getDropDataPoint(300, 250, makeCanvas(), { x: 0, y: 0 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, {
      x: 30,
      y: 20,
    });
    expect(corner).toEqual({ x: 200, y: 200 });
    expect(center).toEqual({ x: 170, y: 180 });
  });

  it("should clamp the anchored position at the edge so the full card stays visible", () => {
    // Cursor near right edge (1095, 300) -> rendered 995, minus grab 30 -> 965,
    // clamped to 1000-100 = 900; y: 300-50=250, minus grab 20 -> 230.
    const result = getDropDataPoint(1095, 300, makeCanvas(), { x: 0, y: 0 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, {
      x: 30,
      y: 20,
    });
    expect(result).toEqual({ x: 900, y: 230 });
  });
});

describe("toDataPoint", () => {
  it("should subtract the scene offset from the rendered point", () => {
    expect(toDataPoint({ x: 200, y: 200 }, { x: -50, y: -30 })).toEqual({ x: 250, y: 230 });
  });

  it("should return the rendered point with a zero scene offset", () => {
    expect(toDataPoint({ x: 200, y: 200 }, { x: 0, y: 0 })).toEqual({ x: 200, y: 200 });
  });
});

describe("isPointInRect", () => {
  const makeEl = (left: number, top: number, right: number, bottom: number) => {
    const el = document.createElement("div");
    el.getBoundingClientRect = () => ({
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
      x: left,
      y: top,
      toJSON: () => {},
    });
    return el;
  };

  it("should return false for a null element", () => {
    expect(isPointInRect(100, 100, null)).toBe(false);
  });

  it("should detect a point inside the rect", () => {
    expect(isPointInRect(150, 150, makeEl(100, 100, 200, 200))).toBe(true);
  });

  it("should detect a point outside the rect", () => {
    expect(isPointInRect(50, 50, makeEl(100, 100, 200, 200))).toBe(false);
  });
});

describe("getClickAddDataPoint", () => {
  it("should return the data point rendering at the overflow margin for the default truck", () => {
    // Default 13.6 m truck: sceneOffset = (-317, -127), so data (333, 143) renders at (16, 16).
    const result = getClickAddDataPoint({ x: 333, y: 170 }, { x: -317, y: -127 });
    expect(result).toEqual({ x: 333, y: 143 });
  });

  it("should fall back to the legacy default when the truck is null", () => {
    const result = getClickAddDataPoint(null);
    expect(result).toEqual({ x: 50, y: 50 });
  });

  it("should fall back to the legacy default when the truck is undefined", () => {
    const result = getClickAddDataPoint(undefined);
    expect(result).toEqual({ x: 50, y: 50 });
  });

  it("should return the margin itself with a zero scene offset", () => {
    const result = getClickAddDataPoint({ x: 333, y: 152 }, { x: 0, y: 0 });
    expect(result).toEqual({ x: 16, y: 16 });
  });
});
