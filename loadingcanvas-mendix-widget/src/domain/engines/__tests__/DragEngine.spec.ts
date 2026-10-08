import { describe, it, expect } from "@jest/globals";
import { DragEngine } from "../DragEngine";
import { CollisionEngine } from "../CollisionEngine";
import { SnapEngine } from "../SnapEngine";
import type { RectLike, Rotation } from "../../../core/types/geometry";
import { isInsideBounds, overlaps } from "../../rules/geometryRules";
import { getTruckBounds } from "../../rules/boundaryRules";

interface TestItem extends RectLike {
  id: string;
  rotation: Rotation;
}

describe("DragEngine", () => {
  const canvasHeight = 600;

  const createItems = (): TestItem[] => [
    { id: "item1", x: 100, y: 100, length: 50, width: 50, rotation: 0 },
    { id: "item2", x: 200, y: 200, length: 50, width: 50, rotation: 0 },
  ];

  describe("constructor", () => {
    it("should initialize with provided items", () => {
      const items = createItems();
      const engine = new DragEngine(items);
      expect(engine.isDragging()).toBe(false);
    });

    it("should accept optional collision and snap engines", () => {
      const items = createItems();
      const collisionEngine = new CollisionEngine();
      const snapEngine = new SnapEngine();
      const engine = new DragEngine(items, collisionEngine, snapEngine);
      expect(engine.isDragging()).toBe(false);
    });
  });

  describe("startDrag", () => {
    it("should set isDragging to true", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      expect(engine.isDragging()).toBe(true);
    });

    it("should do nothing when activeId does not exist in items", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("nonexistent", ["nonexistent"], { x: 120, y: 120 });
      expect(engine.isDragging()).toBe(false);
    });

    it("should record start positions for all selected items", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1", "item2"], { x: 120, y: 120 });
      // After startDrag, move should use the recorded positions
      const result = engine.move({ x: 200, y: 200 }, canvasHeight, canvasHeight);
      // item1 should have moved from (100,100) to near (200,200)
      const item1 = result.find((i) => i.id === "item1");
      expect(item1).toBeDefined();
      expect(item1!.x).not.toBe(100);
    });

    it("should record pointer offset for cursor-relative dragging", () => {
      const engine = new DragEngine(createItems());
      // Mouse at (120, 120), item1 at (100, 100) Ã¢â€ â€™ offset = (20, 20)
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      // Move mouse to (200, 200) Ã¢â€ â€™ base position = (200-20, 200-20) = (180, 180)
      const result = engine.move({ x: 200, y: 200 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      // 180 snapped to grid 20 Ã¢â€ â€™ 180
      expect(item1!.x).toBe(180);
      expect(item1!.y).toBe(180);
    });
  });

  describe("move", () => {
    it("should return current items when not dragging", () => {
      const engine = new DragEngine(createItems());
      const result = engine.move({ x: 200, y: 200 }, canvasHeight, canvasHeight);
      expect(result).toEqual(createItems());
    });

    it("should update item positions based on mouse movement", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      const result = engine.move({ x: 300, y: 300 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      // base = (300-20, 300-20) = (280, 280), snapped to grid 20 Ã¢â€ â€™ 280
      expect(item1!.x).toBe(280);
      expect(item1!.y).toBe(280);
    });

    it("should not move items that are not in the selected set", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      const result = engine.move({ x: 300, y: 300 }, canvasHeight, canvasHeight);
      const item2 = result.find((i) => i.id === "item2");
      expect(item2!.x).toBe(200);
      expect(item2!.y).toBe(200);
    });

    it("should apply grid snapping during move", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      // Move to (215, 215) Ã¢â€ â€™ base = (195, 195) Ã¢â€ â€™ snapped to 200
      const result = engine.move({ x: 215, y: 215 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      expect(item1!.x).toBe(200);
      expect(item1!.y).toBe(200);
    });

    it("should clamp position within canvas bounds", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      // Move far beyond canvas
      const result = engine.move({ x: 5000, y: 5000 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      expect(item1!.x).toBeLessThanOrEqual(canvasHeight - item1!.length);
      expect(item1!.y).toBeLessThanOrEqual(canvasHeight - item1!.width);
    });

    it("should work without collision and snap engines", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      const result = engine.move({ x: 300, y: 300 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      expect(item1!.x).toBe(280);
      expect(item1!.y).toBe(280);
    });

    it("should work with collision engine", () => {
      const collisionEngine = new CollisionEngine();
      const engine = new DragEngine(createItems(), collisionEngine);
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      // Move item1 to overlap with item2
      const result = engine.move({ x: 220, y: 220 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      // Collision engine should resolve non-overlapping position
      const item2 = result.find((i) => i.id === "item2");
      // item1 should not overlap item2
      const item1Rect = { x: item1!.x, y: item1!.y, length: item1!.length, width: item1!.width };
      const item2Rect = { x: item2!.x, y: item2!.y, length: item2!.length, width: item2!.width };
      // They should not overlap (with some tolerance)
      const overlaps =
        item1Rect.x < item2Rect.x + item2Rect.length &&
        item1Rect.x + item1Rect.length > item2Rect.x &&
        item1Rect.y < item2Rect.y + item2Rect.width &&
        item1Rect.y + item1Rect.width > item2Rect.y;
      expect(overlaps).toBe(false);
    });

    it("should keep the exact cursor position when overlap is allowed (free placement, BR-46)", () => {
      const collisionEngine = new CollisionEngine();
      const engine = new DragEngine(createItems(), collisionEngine);
      engine.setAllowOverlap(true);
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      // Base (200,200) sits exactly on item2; free placement keeps it there.
      const result = engine.move({ x: 220, y: 220 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      expect(item1!.x).toBe(200);
      expect(item1!.y).toBe(200);
    });

    it("should work with snap engine", () => {
      const snapEngine = new SnapEngine();
      const engine = new DragEngine(createItems(), undefined, snapEngine);
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      const result = engine.move({ x: 300, y: 300 }, canvasHeight, canvasHeight);
      const item1 = result.find((i) => i.id === "item1");
      expect(item1).toBeDefined();
    });
  });

  describe("endDrag", () => {
    it("should set isDragging to false", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      expect(engine.isDragging()).toBe(true);
      engine.endDrag();
      expect(engine.isDragging()).toBe(false);
    });

    it("should clear start positions and offsets", () => {
      const engine = new DragEngine(createItems());
      engine.startDrag("item1", ["item1"], { x: 120, y: 120 });
      engine.endDrag();
      // After endDrag, move should return items unchanged
      const result = engine.move({ x: 500, y: 500 }, canvasHeight, canvasHeight);
      expect(result).toEqual(createItems());
    });
  });

  describe("updateItems", () => {
    it("should sync internal items with external state", () => {
      const engine = new DragEngine(createItems());
      const newItems: TestItem[] = [{ id: "item3", x: 300, y: 300, length: 50, width: 50, rotation: 0 }];
      engine.updateItems(newItems);
      // Start drag on item3
      engine.startDrag("item3", ["item3"], { x: 320, y: 320 });
      const result = engine.move({ x: 400, y: 400 }, canvasHeight, canvasHeight);
      const item3 = result.find((i) => i.id === "item3");
      expect(item3).toBeDefined();
      expect(item3!.x).not.toBe(300);
    });
  });

  describe("rotateItem", () => {
    it("should re-anchor the item around its center without engines", () => {
      const items: TestItem[] = [
        { id: "item1", x: 100, y: 100, length: 100, width: 50, rotation: 0 },
        { id: "item2", x: 200, y: 200, length: 50, width: 50, rotation: 0 },
      ];
      const engine = new DragEngine(items);
      const result = engine.rotateItem("item1");
      const item1 = result.find((i) => i.id === "item1");
      expect(item1!.rotation).toBe(90);
      expect(item1!.x).toBe(125);
      expect(item1!.y).toBe(75);
      const item2 = result.find((i) => i.id === "item2");
      expect(item2).toEqual(items[1]);
    });

    it("should do nothing for an unknown id", () => {
      const engine = new DragEngine(createItems());
      const result = engine.rotateItem("nonexistent");
      expect(result).toEqual(createItems());
    });

    it("should resolve the rotated position into the given bounds without overlaps", () => {
      const items: TestItem[] = [
        { id: "a", x: 340, y: 160, length: 100, width: 40, rotation: 0 },
        { id: "b", x: 360, y: 170, length: 80, width: 80, rotation: 0 },
      ];
      const engine = new DragEngine(items, new CollisionEngine());
      const result = engine.rotateItem("a", getTruckBounds());
      const a = result.find((i) => i.id === "a")!;
      const b = result.find((i) => i.id === "b")!;
      expect(a.rotation).toBe(90);
      expect(isInsideBounds(a, getTruckBounds())).toBe(true);
      expect(overlaps(a, b)).toBe(false);
    });

    it("should rotate in place despite an overlap when overlap is allowed (free placement, BR-46)", () => {
      const items: TestItem[] = [
        { id: "a", x: 100, y: 100, length: 100, width: 50, rotation: 0 },
        { id: "b", x: 120, y: 80, length: 80, width: 80, rotation: 0 },
      ];
      const engine = new DragEngine(items, new CollisionEngine());
      engine.setAllowOverlap(true);
      const result = engine.rotateItem("a", { x: 0, y: 0, length: 1000, width: 600 });
      const a = result.find((i) => i.id === "a")!;
      // Center-anchored rotation (125,75) is kept even though b overlaps it.
      expect(a.rotation).toBe(90);
      expect(a.x).toBe(125);
      expect(a.y).toBe(75);
    });

    it("should fall back to the starting pose when no valid placement exists", () => {
      const items: TestItem[] = [{ id: "big", x: 100, y: 100, length: 20, width: 6, rotation: 0 }];
      const engine = new DragEngine(items, new CollisionEngine());
      const result = engine.rotateItem("big", { x: 0, y: 0, length: 8, width: 8 });
      const big = result.find((i) => i.id === "big")!;
      // Neither orientation fits the tiny bounds -> entire previous pose preserved
      expect(big.rotation).toBe(0);
      expect(big.x).toBe(100);
      expect(big.y).toBe(100);
    });
  });
});
