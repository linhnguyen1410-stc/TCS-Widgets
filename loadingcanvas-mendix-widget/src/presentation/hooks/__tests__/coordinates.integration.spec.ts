import { describe, it, expect } from "@jest/globals";
import { getCanvasPoint, toDataPoint, getDropDataPoint, getClickAddDataPoint, isPointInRect } from "../coordinateRule";
import { Size, Point } from "../../../core/types/geometry";
import { clamp } from "../../../domain/rules/boundaryRules";

describe("Integration: Coordinate Conversion (Hook Layer → State Layer)", () => {
  const CANVAS_WIDTH = 1800;
  const CANVAS_HEIGHT = 600;
  const SIZE: Size = { length: 120, width: 80 };

  const makeRect = (left: number, top: number, right: number, bottom: number): DOMRect => ({
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

  describe("getCanvasPoint: client → canvas-relative", () => {
    it("returns {0,0} when canvas is null", () => {
      const result = getCanvasPoint(null, 100, 200);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("converts client coordinates to canvas-relative", () => {
      const canvas = makeCanvas(100, 50);
      const result = getCanvasPoint(canvas, 250, 300);
      expect(result).toEqual({ x: 150, y: 250 });
    });

    it("handles negative client coordinates", () => {
      const canvas = makeCanvas(100, 100);
      const result = getCanvasPoint(canvas, 50, 80);
      expect(result).toEqual({ x: -50, y: -20 });
    });
  });

  describe("toDataPoint: rendered (R) → data (D) = R - sceneOffset", () => {
    it("subtracts scene offset", () => {
      expect(toDataPoint({ x: 200, y: 200 }, { x: 80, y: 40 })).toEqual({ x: 120, y: 160 });
    });

    it("handles negative scene offset", () => {
      expect(toDataPoint({ x: 200, y: 200 }, { x: -50, y: -30 })).toEqual({ x: 250, y: 230 });
    });

    it("returns same point with zero scene offset", () => {
      expect(toDataPoint({ x: 200, y: 200 }, { x: 0, y: 0 })).toEqual({ x: 200, y: 200 });
    });
  });

  describe("getDropDataPoint: client drop → clamped data point", () => {
    it("returns origin when canvas is null", () => {
      const result = getDropDataPoint(100, 200, null, { x: 80, y: 40 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it("subtracts positive scene offset from unclamped position", () => {
      const result = getDropDataPoint(300, 250, makeCanvas(), { x: 80, y: 40 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toEqual({ x: 120, y: 160 });
    });

    it("subtracts negative scene offset", () => {
      const result = getDropDataPoint(300, 250, makeCanvas(), { x: -50, y: -30 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toEqual({ x: 250, y: 230 });
    });

    it("preserves grab anchor: center-grab vs corner-grab differs by grab delta", () => {
      const corner = getDropDataPoint(300, 250, makeCanvas(), { x: 0, y: 0 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);
      const center = getDropDataPoint(300, 250, makeCanvas(), { x: 0, y: 0 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, {
        x: 30,
        y: 20,
      });
      expect(corner).toEqual({ x: 200, y: 200 });
      expect(center).toEqual({ x: 170, y: 180 });
    });

    it("clamps anchored position at edge so full card stays visible", () => {
      const result = getDropDataPoint(1095, 300, makeCanvas(), { x: 0, y: 0 }, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, {
        x: 30,
        y: 20,
      });
      expect(result).toEqual({ x: 965, y: 230 });
    });

    it("clamps oversized item to origin", () => {
      const oversize: Size = { length: 2000, width: 700 };
      const result = getDropDataPoint(500, 300, makeCanvas(), { x: 0, y: 0 }, oversize, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(result).toEqual({ x: 0, y: 0 });
    });
  });

  describe("getClickAddDataPoint: default data position for click-to-add", () => {
    it("returns data point rendering at OVERFLOW_MARGIN (16px) for default truck", () => {
      const result = getClickAddDataPoint({ x: 333, y: 170 }, { x: -317, y: -127 });
      expect(result).toEqual({ x: 333, y: 143 });
    });

    it("falls back to legacy default when truck is null", () => {
      const result = getClickAddDataPoint(null);
      expect(result).toEqual({ x: 50, y: 50 });
    });

    it("falls back to legacy default when truck is undefined", () => {
      const result = getClickAddDataPoint(undefined);
      expect(result).toEqual({ x: 50, y: 50 });
    });

    it("returns margin itself with zero scene offset", () => {
      const result = getClickAddDataPoint({ x: 333, y: 152 }, { x: 0, y: 0 });
      expect(result).toEqual({ x: 16, y: 16 });
    });
  });

  describe("isPointInRect: hit-test for unified pointer gesture", () => {
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

    it("returns false for null element", () => {
      expect(isPointInRect(100, 100, null)).toBe(false);
    });

    it("detects point inside rect", () => {
      expect(isPointInRect(150, 150, makeEl(100, 100, 200, 200))).toBe(true);
    });

    it("detects point outside rect", () => {
      expect(isPointInRect(50, 50, makeEl(100, 100, 200, 200))).toBe(false);
    });

    it("detects point on edge as inside", () => {
      expect(isPointInRect(100, 150, makeEl(100, 100, 200, 200))).toBe(true);
      expect(isPointInRect(200, 150, makeEl(100, 100, 200, 200))).toBe(true);
    });
  });

  describe("Round-trip: drop → data → render", () => {
    it("drop at client -> data -> render matches original client (with zero sceneOffset)", () => {
      const clientX = 300,
        clientY = 250;
      const canvas = makeCanvas();
      const sceneOffset: Point = { x: 0, y: 0 };

      const dataPoint = getDropDataPoint(clientX, clientY, canvas, sceneOffset, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);

      const renderedX = dataPoint.x + sceneOffset.x;
      const renderedY = dataPoint.y + sceneOffset.y;

      const expectedClientX = renderedX + canvas.getBoundingClientRect().left;
      const expectedClientY = renderedY + canvas.getBoundingClientRect().top;

      expect(expectedClientX).toBe(clientX);
      expect(expectedClientY).toBe(clientY);
    });

    it("round-trip with sceneOffset preserves visual position", () => {
      const clientX = 300,
        clientY = 250;
      const canvas = makeCanvas(100, 50);
      const sceneOffset: Point = { x: 80, y: 40 };

      const dataPoint = getDropDataPoint(clientX, clientY, canvas, sceneOffset, SIZE, CANVAS_WIDTH, CANVAS_HEIGHT);

      const renderedX = dataPoint.x + sceneOffset.x;
      const renderedY = dataPoint.y + sceneOffset.y;

      const rect = canvas.getBoundingClientRect();
      const expectedClientX = renderedX + rect.left;
      const expectedClientY = renderedY + rect.top;

      const clampedX = clamp(clientX - rect.left - 0, 0, CANVAS_WIDTH - SIZE.length);
      const clampedY = clamp(clientY - rect.top - 0, 0, CANVAS_HEIGHT - SIZE.width);
      expect(expectedClientX).toBe(clampedX + rect.left);
      expect(expectedClientY).toBe(clampedY + rect.top);
    });
  });
});
