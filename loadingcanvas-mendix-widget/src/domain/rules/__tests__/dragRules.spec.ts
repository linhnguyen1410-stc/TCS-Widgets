import { describe, it, expect } from "@jest/globals";
import { calculateDragPosition } from "../dragRules";

describe("dragRules", () => {
  describe("calculateDragPosition", () => {
    const item = { x: 10, y: 10, length: 50, width: 30 };
    const startPosition = { x: 10, y: 10 };
    const canvasWidth = 1000;
    const canvasHeight = 600;

    it("should snap position to grid and clamp within canvas bounds", () => {
      const result = calculateDragPosition(item, { x: 100, y: 100 }, 0, 0, canvasWidth, canvasHeight);
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it("should apply delta to start position", () => {
      const result = calculateDragPosition(item, startPosition, 35, 25, canvasWidth, canvasHeight);
      // startPosition.x + deltaX = 10 + 35 = 45, snapped to grid 20 â†’ 40
      // startPosition.y + deltaY = 10 + 25 = 35, snapped to grid 20 â†’ 40
      expect(result.x).toBe(40);
      expect(result.y).toBe(40);
    });

    it("should clamp x to 0 when target is negative", () => {
      const result = calculateDragPosition(item, { x: -100, y: 100 }, 0, 0, canvasWidth, canvasHeight);
      expect(result.x).toBe(0);
    });

    it("should clamp y to 0 when target is negative", () => {
      const result = calculateDragPosition(item, { x: 100, y: -100 }, 0, 0, canvasWidth, canvasHeight);
      expect(result.y).toBe(0);
    });

    it("should clamp x to canvasWidth - item.length when target exceeds bounds", () => {
      const result = calculateDragPosition(item, { x: 2000, y: 100 }, 0, 0, canvasWidth, canvasHeight);
      expect(result.x).toBe(canvasWidth - item.length);
    });

    it("should clamp y to canvasHeight - item.width when target exceeds bounds", () => {
      const result = calculateDragPosition(item, { x: 100, y: 2000 }, 0, 0, canvasWidth, canvasHeight);
      expect(result.y).toBe(canvasHeight - item.width);
    });

    it("should preserve other item properties", () => {
      const itemWithExtra = { x: 10, y: 10, length: 50, width: 30, id: "test-id", rotation: 0 as const };
      const result = calculateDragPosition(itemWithExtra, { x: 100, y: 100 }, 0, 0, canvasWidth, canvasHeight);
      expect(result.id).toBe("test-id");
      expect(result.rotation).toBe(0);
      expect(result.length).toBe(50);
      expect(result.width).toBe(30);
    });

    it("should use custom grid size when provided", () => {
      const result = calculateDragPosition(item, { x: 15, y: 15 }, 0, 0, canvasWidth, canvasHeight, 10);
      expect(result.x).toBe(20);
      expect(result.y).toBe(20);
    });

    it("should use default grid size (20) when not provided", () => {
      const result = calculateDragPosition(item, { x: 25, y: 25 }, 0, 0, canvasWidth, canvasHeight);
      expect(result.x).toBe(20);
      expect(result.y).toBe(20);
    });
  });
});
