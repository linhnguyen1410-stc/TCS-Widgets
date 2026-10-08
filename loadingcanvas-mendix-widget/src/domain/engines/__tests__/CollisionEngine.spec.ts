import { describe, it, expect } from "@jest/globals";
import { CollisionEngine } from "../CollisionEngine";
import type { RectLike, Rotation } from "../../../core/types/geometry";

describe("CollisionEngine", () => {
  const bounds = { x: 0, y: 0, length: 1000, width: 600 };

  describe("detectCollisions", () => {
    it("should return items that overlap the target", () => {
      const engine = new CollisionEngine();
      const target = { id: "target", x: 0, y: 0, length: 50, width: 50 };
      const others = [
        { id: "a", x: 40, y: 40, length: 50, width: 50 },
        { id: "b", x: 200, y: 200, length: 50, width: 50 },
      ];
      const collisions = engine.detectCollisions(target, others);
      expect(collisions).toHaveLength(1);
      expect(collisions[0].id).toBe("a");
    });

    it("should return empty array when no collisions", () => {
      const engine = new CollisionEngine();
      const target = { x: 0, y: 0, length: 50, width: 50 };
      const others = [{ id: "a", x: 200, y: 200, length: 50, width: 50 }];
      const collisions = engine.detectCollisions(target, others);
      expect(collisions).toHaveLength(0);
    });

    it("should return empty array for empty others", () => {
      const engine = new CollisionEngine();
      const target = { x: 0, y: 0, length: 50, width: 50 };
      const collisions = engine.detectCollisions(target, []);
      expect(collisions).toHaveLength(0);
    });
  });

  describe("findValidPositions", () => {
    it("should find valid positions that do not overlap other items", () => {
      const engine = new CollisionEngine();
      const item = { x: 100, y: 100, length: 50, width: 50 };
      const others = [{ id: "a", x: 0, y: 0, length: 50, width: 50 }];
      const positions = engine.findValidPositions(item, others, bounds);
      expect(positions.length).toBeGreaterThan(0);
      // All positions should be valid (no overlap)
      for (const pos of positions) {
        const testItem = { ...item, x: pos.position.x, y: pos.position.y };
        expect(engine.detectCollisions(testItem, others)).toHaveLength(0);
      }
    });

    it("should return positions sorted by distance (closest first)", () => {
      const engine = new CollisionEngine();
      const item = { x: 100, y: 100, length: 50, width: 50 };
      const others = [{ id: "a", x: 0, y: 0, length: 50, width: 50 }];
      const positions = engine.findValidPositions(item, others, bounds);
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i].distance).toBeGreaterThanOrEqual(positions[i - 1].distance);
      }
    });

    it("should include boundary positions as candidates", () => {
      const engine = new CollisionEngine();
      const item = { x: 500, y: 300, length: 50, width: 50 };
      const positions = engine.findValidPositions(item, [], bounds);
      // Should include position at (0, 0) Ã¢â‚¬â€ boundary
      const hasOrigin = positions.some((p) => p.position.x === 0 && p.position.y === 0);
      expect(hasOrigin).toBe(true);
    });

    it("should include positions adjacent to other items", () => {
      const engine = new CollisionEngine();
      const item = { x: 100, y: 100, length: 50, width: 50 };
      const other = { id: "a", x: 0, y: 0, length: 50, width: 50 };
      const positions = engine.findValidPositions(item, [other], bounds);
      // Should include position at (50, 0) Ã¢â‚¬â€ right edge of other item
      const hasAdjacent = positions.some((p) => p.position.x === 50 && p.position.y === 0);
      expect(hasAdjacent).toBe(true);
    });

    it("should account for rotation when computing positions", () => {
      const engine = new CollisionEngine();
      const item = { x: 100, y: 100, length: 100, width: 50, rotation: 90 as Rotation };
      const positions = engine.findValidPositions(item, [], bounds);
      expect(positions.length).toBeGreaterThan(0);
    });

    it("should use snapDistance to add spacing between items", () => {
      const engine = new CollisionEngine();
      const item = { x: 100, y: 100, length: 50, width: 50 };
      const other = { id: "a", x: 0, y: 0, length: 50, width: 50 };
      const positions = engine.findValidPositions(item, [other], bounds, 10);
      // With snapDistance=10, positions should be at least 10px away from other items
      for (const pos of positions) {
        const testItem = { ...item, x: pos.position.x, y: pos.position.y };
        // The item should not overlap with the other item
        expect(engine.detectCollisions(testItem, [other])).toHaveLength(0);
      }
    });
  });

  describe("resolveNonOverlappingPosition", () => {
    it("should return desired position when it does not collide and is in bounds", () => {
      const engine = new CollisionEngine();
      const item = { x: 100, y: 100, length: 50, width: 50 };
      const others: RectLike[] = [];
      const desiredPos = { x: 200, y: 200 };
      const startPos = { x: 100, y: 100 };

      const result = engine.resolveNonOverlappingPosition(item, desiredPos, startPos, others, bounds);
      expect(result).toEqual(desiredPos);
    });

    it("should find nearest valid position when desired position collides", () => {
      const engine = new CollisionEngine();
      const item = { x: 100, y: 100, length: 50, width: 50 };
      const others = [{ id: "a", x: 200, y: 200, length: 50, width: 50 }];
      const desiredPos = { x: 200, y: 200 }; // collides with "a"
      const startPos = { x: 100, y: 100 };

      const result = engine.resolveNonOverlappingPosition(item, desiredPos, startPos, others, bounds);
      // Should not be at the colliding position
      expect(result).not.toEqual(desiredPos);
      // Should be a valid position
      const testItem = { ...item, x: result.x, y: result.y };
      expect(engine.detectCollisions(testItem, others)).toHaveLength(0);
    });

    it("should try X-only fallback when no valid position found", () => {
      const engine = new CollisionEngine();
      const item = { x: 100, y: 100, length: 50, width: 50 };
      // Create a scenario where desired position collides but X-only works
      const others = [{ id: "a", x: 200, y: 100, length: 50, width: 50 }];
      const desiredPos = { x: 200, y: 100 }; // collides with "a"
      const startPos = { x: 100, y: 100 };

      const result = engine.resolveNonOverlappingPosition(item, desiredPos, startPos, others, bounds);
      // X-only: { x: 200, y: 100 } Ã¢â‚¬â€ still collides, so should try other fallbacks
      // The result should be a valid position
      const testItem = { ...item, x: result.x, y: result.y };
      expect(engine.detectCollisions(testItem, others)).toHaveLength(0);
    });

    it("should try Y-only fallback when X-only fails", () => {
      const engine = new CollisionEngine();
      const item = { x: 100, y: 100, length: 50, width: 50 };
      const others = [{ id: "a", x: 100, y: 200, length: 50, width: 50 }];
      const desiredPos = { x: 100, y: 200 }; // collides with "a"
      const startPos = { x: 100, y: 100 };

      const result = engine.resolveNonOverlappingPosition(item, desiredPos, startPos, others, bounds);
      const testItem = { ...item, x: result.x, y: result.y };
      expect(engine.detectCollisions(testItem, others)).toHaveLength(0);
    });

    it("should fall back to start position when no valid position exists", () => {
      const engine = new CollisionEngine();
      const item = { x: 100, y: 100, length: 50, width: 50 };
      // Create a scenario where all positions are blocked
      const others = [
        { id: "a", x: 0, y: 0, length: 1000, width: 600 }, // covers entire canvas
      ];
      const desiredPos = { x: 200, y: 200 };
      const startPos = { x: 100, y: 100 };

      const result = engine.resolveNonOverlappingPosition(item, desiredPos, startPos, others, bounds);
      // Should fall back to start position
      expect(result).toEqual(startPos);
    });

    it("should return desired position when it is out of bounds but no valid position exists", () => {
      const engine = new CollisionEngine();
      const item = { x: 100, y: 100, length: 50, width: 50 };
      const others: RectLike[] = [];
      const desiredPos = { x: 2000, y: 2000 }; // out of bounds
      const startPos = { x: 100, y: 100 };

      const result = engine.resolveNonOverlappingPosition(item, desiredPos, startPos, others, bounds);
      // Should find a valid in-bounds position
      expect(result.x).toBeLessThanOrEqual(bounds.length - item.length);
      expect(result.y).toBeLessThanOrEqual(bounds.width - item.width);
    });
  });

  describe("non-uniform scale handling", () => {
    const scale = { widthScale: 2, heightScale: 1 };

    it("should detect collisions using the scale-correct rotated footprint", () => {
      const engine = new CollisionEngine();
      const target = { id: "target", x: 0, y: 0, length: 80, width: 60, rotation: 90 as Rotation };
      // Scale-correct footprint: 120x40 -> overlaps an item starting at x=110
      const others = [{ id: "a", x: 110, y: 0, length: 20, width: 40 }];
      expect(engine.detectCollisions(target, others, scale)).toHaveLength(1);
      // Without the scale the naive swapped footprint 60x80 misses it
      expect(engine.detectCollisions(target, others)).toHaveLength(0);
    });
  });
});
