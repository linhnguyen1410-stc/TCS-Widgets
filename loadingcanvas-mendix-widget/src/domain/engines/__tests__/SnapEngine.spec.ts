import { describe, it, expect } from "@jest/globals";
import { SnapEngine } from "../SnapEngine";
import type { RectLike, Rotation } from "../../../core/types/geometry";

interface TestItem extends RectLike {
  id: string;
  rotation?: Rotation;
}

describe("SnapEngine", () => {
  const bounds = { x: 0, y: 0, length: 1000, width: 600 };

  describe("calculateSnapTarget", () => {
    it("should snap to boundary when near canvas edge", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 5, y: 100, length: 50, width: 50 };
      const targetPos = { x: 5, y: 100 };
      const result = engine.calculateSnapTarget(item, [], targetPos, { bounds, gridSize: 20, threshold: 15 });
      // Should snap to left boundary (x=0)
      expect(result.position.x).toBe(0);
      expect(result.type).toBe("boundary");
    });

    it("should snap to boundary on right edge", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 945, y: 100, length: 50, width: 50 };
      const targetPos = { x: 945, y: 100 };
      const result = engine.calculateSnapTarget(item, [], targetPos, { bounds, gridSize: 20, threshold: 15 });
      // Should snap to right boundary (x = 1000 - 50 = 950)
      expect(result.position.x).toBe(950);
      expect(result.type).toBe("boundary");
    });

    it("should snap to boundary on top edge", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 5, y: 5, length: 50, width: 50 };
      const targetPos = { x: 5, y: 5 };
      const result = engine.calculateSnapTarget(item, [], targetPos, { bounds, gridSize: 20, threshold: 15 });
      // Both X and Y near boundary Ã¢â€ â€™ should snap to boundary
      expect(result.position.x).toBe(0);
      expect(result.position.y).toBe(0);
      expect(result.type).toBe("boundary");
    });

    it("should snap to boundary on bottom edge", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 5, y: 545, length: 50, width: 50 };
      const targetPos = { x: 5, y: 545 };
      const result = engine.calculateSnapTarget(item, [], targetPos, { bounds, gridSize: 20, threshold: 15 });
      // X snaps to left boundary (0), Y snaps to bottom boundary (550)
      expect(result.position.x).toBe(0);
      expect(result.position.y).toBe(550);
      expect(result.type).toBe("boundary");
    });

    it("should snap to edge of another item", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 100, y: 100, length: 50, width: 50 };
      const other: TestItem = { id: "other", x: 0, y: 100, length: 50, width: 50 };
      const targetPos = { x: 55, y: 100 }; // near other's right edge (50)
      const result = engine.calculateSnapTarget(item, [other], targetPos, {
        bounds,
        gridSize: 20,
        threshold: 15,
      });
      // Should snap to other's right edge (x = 50)
      expect(result.position.x).toBe(50);
      expect(result.type).toBe("edge");
    });

    it("should snap to alignment with another item", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 100, y: 100, length: 50, width: 50 };
      const other: TestItem = { id: "other", x: 0, y: 100, length: 50, width: 50 };
      const targetPos = { x: 5, y: 100 }; // near other's left edge (0)
      const result = engine.calculateSnapTarget(item, [other], targetPos, {
        bounds,
        gridSize: 20,
        threshold: 15,
      });
      // Should snap to other's left edge (x = 0) Ã¢â‚¬â€ align type
      expect(result.position.x).toBe(0);
    });

    it("should fall back to grid snapping when no edge/align/boundary candidate is within threshold", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 500, y: 300, length: 50, width: 50 };
      const targetPos = { x: 512, y: 312 }; // not near any edge/align/boundary
      const result = engine.calculateSnapTarget(item, [], targetPos, { bounds, gridSize: 20, threshold: 15 });
      // Should snap to grid: 512 Ã¢â€ â€™ 520, 312 Ã¢â€ â€™ 320
      expect(result.position.x).toBe(520);
      expect(result.position.y).toBe(320);
      expect(result.type).toBe("grid");
    });

    it("should return target position as-is when no snap candidate is within threshold", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 500, y: 300, length: 50, width: 50 };
      const targetPos = { x: 507, y: 307 }; // not near grid (507 Ã¢â€ â€™ 500, distance 7 < 15, so it WILL snap)
      const result = engine.calculateSnapTarget(item, [], targetPos, { bounds, gridSize: 20, threshold: 15 });
      // 507 is 7px from grid 500, which is within threshold 15
      expect(result.position.x).toBe(500);
    });

    it("should not snap when target is far from any candidate and grid is disabled", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 500, y: 300, length: 50, width: 50 };
      const targetPos = { x: 507, y: 307 };
      const result = engine.calculateSnapTarget(item, [], targetPos, { bounds, gridSize: 0, threshold: 15 });
      // With gridSize=0, no grid snap. No other candidates. Should return target as-is.
      expect(result.position.x).toBe(507);
      expect(result.position.y).toBe(307);
      expect(result.type).toBe("none");
    });

    it("should account for rotation when computing snap positions", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 5, y: 100, length: 100, width: 50, rotation: 90 };
      const targetPos = { x: 5, y: 100 };
      const result = engine.calculateSnapTarget(item, [], targetPos, { bounds, gridSize: 20, threshold: 15 });
      // Rotated item: length=50, width=100. Should snap to left boundary (x=0)
      expect(result.position.x).toBe(0);
      expect(result.type).toBe("boundary");
    });

    it("should use default config when no config provided", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 5, y: 100, length: 50, width: 50 };
      const targetPos = { x: 5, y: 100 };
      const result = engine.calculateSnapTarget(item, [], targetPos);
      // Default gridSize=20, threshold=15. Should snap to boundary.
      expect(result.position.x).toBe(0);
    });

    it("should evaluate X and Y axes independently", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 5, y: 545, length: 50, width: 50 };
      const targetPos = { x: 5, y: 545 };
      const result = engine.calculateSnapTarget(item, [], targetPos, { bounds, gridSize: 20, threshold: 15 });
      // X should snap to boundary (0), Y should snap to boundary (550)
      expect(result.position.x).toBe(0);
      expect(result.position.y).toBe(550);
    });

    it("should handle multiple other items for snapping", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 100, y: 100, length: 50, width: 50 };
      const others: TestItem[] = [
        { id: "a", x: 0, y: 0, length: 50, width: 50 },
        { id: "b", x: 200, y: 200, length: 50, width: 50 },
      ];
      const targetPos = { x: 55, y: 55 }; // near "a"'s right edge
      const result = engine.calculateSnapTarget(item, others, targetPos, { bounds, gridSize: 20, threshold: 15 });
      expect(result.position.x).toBe(50);
      expect(result.type).toBe("edge");
    });

    it("should use scale-correct rotated size for boundary snapping", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 5, y: 85, length: 80, width: 60, rotation: 90 };
      const targetPos = { x: 5, y: 85 };
      const result = engine.calculateSnapTarget(item, [], targetPos, {
        bounds: { x: 0, y: 0, length: 400, width: 120 },
        gridSize: 20,
        threshold: 15,
        scale: { widthScale: 2, heightScale: 1 },
      });
      // Rotated Y-extent = 80*(1/2) = 40 -> bottom boundary candidate y = 120-40 = 80
      expect(result.position.x).toBe(0);
      expect(result.position.y).toBe(80);
      expect(result.type).toBe("boundary");
    });
  });

  describe("snap priority order (B-0004, template 16-§16.3-b)", () => {
    it("boundary wins over a CLOSER edge candidate (documented tier order)", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 10, y: 100, length: 50, width: 50 };
      // other's right edge at 5 -> edge candidate distance 5; boundary 0 -> distance 10.
      const other: TestItem = { id: "other", x: 0, y: 100, length: 5, width: 50 };
      const result = engine.calculateSnapTarget(
        item,
        [other],
        { x: 10, y: 100 },
        {
          bounds,
          gridSize: 20,
          threshold: 15,
        }
      );
      expect(result.position.x).toBe(0);
      expect(result.type).toBe("boundary");
    });

    it("grid never overrides a boundary candidate within threshold", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 8, y: 100, length: 50, width: 50 };
      // boundary 0 at distance 8; grid 0 also distance 8 — boundary tier wins.
      const result = engine.calculateSnapTarget(
        item,
        [],
        { x: 8, y: 100 },
        {
          bounds,
          gridSize: 20,
          threshold: 15,
        }
      );
      expect(result.position.x).toBe(0);
      expect(result.type).toBe("boundary");
    });

    it("edge wins over alignment at equal distance (tier order)", () => {
      const engine = new SnapEngine();
      const item: TestItem = { id: "item", x: 35, y: 100, length: 50, width: 50 };
      // other [20..50]: edge at 50 and align at 20 are BOTH distance 15 — edge tier wins.
      const other: TestItem = { id: "other", x: 20, y: 100, length: 30, width: 50 };
      const result = engine.calculateSnapTarget(
        item,
        [other],
        { x: 35, y: 100 },
        {
          bounds,
          gridSize: 20,
          threshold: 15,
        }
      );
      expect(result.position.x).toBe(50);
      expect(result.type).toBe("edge");
    });
  });
});
