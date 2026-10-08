import { describe, it, expect, jest } from "@jest/globals";
import { CanvasActionDispatcher } from "../CanvasActionDispatcher";
import { CanvasStateManager } from "../CanvasStateManager";
import { DragEngine } from "../../domain/engines/DragEngine";
import { CollisionEngine } from "../../domain/engines/CollisionEngine";
import { SnapEngine } from "../../domain/engines/SnapEngine";
import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import type { CanvasState } from "../CanvasState";
import { isInsideBounds } from "../../domain/rules/geometryRules";
import { getCanvasBounds } from "../../domain/rules/boundaryRules";

describe("CanvasActionDispatcher", () => {
  const canvasWidth = 1000;
  const canvasHeight = 600;

  const createCargoItem = (overrides: Partial<CargoItem> = {}): CargoItem => ({
    id: "item1",
    x: 100,
    y: 100,
    length: 50,
    width: 50,
    rotation: 0,
    name: "Test Item",
    type: "pallet",
    color: "red",
    isLocked: false,
    ...overrides,
  });

  const createInitialState = (cargos: CargoItem[] = [], scale = { widthScale: 1, heightScale: 1 }): CanvasState => ({
    truck: null,
    cargos,
    selectedIds: [],
    activeItemId: null,
    validation: { valid: true, errors: [] },
    scale,
  });

  const createDispatcher = (
    initialCargos: CargoItem[] = [],
    scale = { widthScale: 1, heightScale: 1 }
  ): {
    manager: CanvasStateManager;
    dispatcher: CanvasActionDispatcher;
    dragEngine: DragEngine<CargoItem>;
  } => {
    const manager = new CanvasStateManager(createInitialState(initialCargos, scale));
    const collisionEngine = new CollisionEngine();
    const snapEngine = new SnapEngine();
    const dragEngine = new DragEngine<CargoItem>(initialCargos, collisionEngine, snapEngine);
    // Mirror the production controller, which runs manual gestures in free placement (BR-46).
    dragEngine.setAllowOverlap(true);
    const dispatcher = new CanvasActionDispatcher(manager, {
      canvasWidth,
      canvasHeight,
      dragEngine,
    });
    return { manager, dispatcher, dragEngine };
  };

  describe("SELECT", () => {
    it("should update selectedIds", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "SELECT", ids: ["item1"] });
      const state = manager.getState();
      expect(state.selectedIds).toEqual(["item1"]);
    });

    it("should set activeItemId when single item selected", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "SELECT", ids: ["item1"] });
      const state = manager.getState();
      expect(state.activeItemId).toBe("item1");
    });

    it("should not change activeItemId when multiple items selected", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ id: "item1" }),
        createCargoItem({ id: "item2", x: 200 }),
      ]);
      dispatcher.dispatch({ type: "SELECT", ids: ["item1", "item2"] });
      const state = manager.getState();
      expect(state.selectedIds).toEqual(["item1", "item2"]);
      expect(state.activeItemId).toBeNull();
    });
  });

  describe("DESELECT", () => {
    it("should clear selectedIds and activeItemId", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "SELECT", ids: ["item1"] });
      dispatcher.dispatch({ type: "DESELECT" });
      const state = manager.getState();
      expect(state.selectedIds).toEqual([]);
      expect(state.activeItemId).toBeNull();
    });
  });

  describe("SET_ACTIVE_ITEM", () => {
    it("should set activeItemId", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "SET_ACTIVE_ITEM", id: "item1" });
      const state = manager.getState();
      expect(state.activeItemId).toBe("item1");
    });

    it("should set activeItemId to null", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "SET_ACTIVE_ITEM", id: "item1" });
      dispatcher.dispatch({ type: "SET_ACTIVE_ITEM", id: null });
      const state = manager.getState();
      expect(state.activeItemId).toBeNull();
    });
  });

  describe("START_DRAG", () => {
    it("should call dragEngine.startDrag and update state", () => {
      const { manager, dispatcher, dragEngine } = createDispatcher([createCargoItem()]);
      const startDragSpy = jest.spyOn(dragEngine, "startDrag");
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item1", mouse: { x: 120, y: 120 } });
      expect(startDragSpy).toHaveBeenCalledWith("item1", ["item1"], { x: 120, y: 120 });
      const state = manager.getState();
      expect(state.activeItemId).toBe("item1");
      expect(state.selectedIds).toEqual(["item1"]);
    });

    it("should use existing selectedIds if activeId is already selected", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ id: "item1" }),
        createCargoItem({ id: "item2", x: 200 }),
      ]);
      dispatcher.dispatch({ type: "SELECT", ids: ["item1", "item2"] });
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item1", mouse: { x: 120, y: 120 } });
      const state = manager.getState();
      expect(state.selectedIds).toEqual(["item1", "item2"]);
      expect(state.activeItemId).toBe("item1");
    });

    it("should set selectedIds to [activeId] if not already selected", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ id: "item1" }),
        createCargoItem({ id: "item2", x: 200 }),
      ]);
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item2", mouse: { x: 220, y: 220 } });
      const state = manager.getState();
      expect(state.selectedIds).toEqual(["item2"]);
      expect(state.activeItemId).toBe("item2");
    });
  });

  describe("DRAG_MOVE", () => {
    it("should update cargos and validation in state", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item1", mouse: { x: 120, y: 120 } });
      dispatcher.dispatch({ type: "DRAG_MOVE", mouse: { x: 300, y: 300 } });
      const state = manager.getState();
      expect(state.cargos).toHaveLength(1);
      expect(state.validation).toBeDefined();
    });

    it("should move the active item to new position", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item1", mouse: { x: 120, y: 120 } });
      dispatcher.dispatch({ type: "DRAG_MOVE", mouse: { x: 300, y: 300 } });
      const state = manager.getState();
      const item = state.cargos[0];
      expect(item.x).not.toBe(100);
    });
  });

  describe("END_DRAG", () => {
    it("should call dragEngine.endDrag and clear activeItemId", () => {
      const { manager, dispatcher, dragEngine } = createDispatcher([createCargoItem()]);
      const endDragSpy = jest.spyOn(dragEngine, "endDrag");
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item1", mouse: { x: 120, y: 120 } });
      dispatcher.dispatch({ type: "END_DRAG" });
      expect(endDragSpy).toHaveBeenCalled();
      const state = manager.getState();
      expect(state.activeItemId).toBeNull();
    });

    it("should preserve selectedIds after drag ends", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item1", mouse: { x: 120, y: 120 } });
      dispatcher.dispatch({ type: "END_DRAG" });
      const state = manager.getState();
      expect(state.selectedIds).toEqual(["item1"]);
    });
  });

  describe("ADD_ITEM", () => {
    it("should append the cargo, sync dragEngine, and evaluate layout validation", () => {
      const { manager, dispatcher } = createDispatcher([]);
      dispatcher.dispatch({
        type: "ADD_ITEM",
        item: createCargoItem({ id: "added", x: 400, y: 200 }),
      });
      const state = manager.getState();
      expect(state.cargos.map((c) => c.id)).toEqual(["added"]);
      expect(state.validation.valid).toBe(true);
      // Engine owns the new item already: rotation works without external syncing.
      dispatcher.dispatch({ type: "ROTATE", itemId: "added" });
      expect(manager.getState().cargos[0].rotation).toBe(90);
    });

    it("keeps the exact spawn position when it lies outside the truck band (free placement)", () => {
      const { manager, dispatcher } = createDispatcher([]);
      dispatcher.dispatch({ type: "ADD_ITEM", item: createCargoItem({ id: "spawned", x: 50, y: 50 }) });
      const state = manager.getState();
      expect(state.cargos).toHaveLength(1);
      expect(state.cargos[0].x).toBe(50);
      expect(state.cargos[0].y).toBe(50);
      expect(state.validation.valid).toBe(true);
    });
  });

  describe("drag settle validation", () => {
    it("re-validates against the widget canvas once the gesture ends (free placement)", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ x: 100, y: 100 })]);
      dispatcher.dispatch({ type: "START_DRAG", activeId: "item1", mouse: { x: 120, y: 120 } });
      dispatcher.dispatch({ type: "END_DRAG" });
      const state = manager.getState();
      expect(state.validation.valid).toBe(true);
      expect(state.validation.errors).not.toContain("OUT_OF_BOUNDS");
    });
  });

  describe("undo/redo engine sync", () => {
    it("restores dragEngine items so the next gesture operates on reverted cargos", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ id: "a", x: 340, y: 160 })]);
      dispatcher.dispatch({
        type: "SET_ITEMS",
        items: [createCargoItem({ id: "b", x: 700, y: 180 })],
      });
      dispatcher.dispatch({ type: "UNDO" });
      // After undo the canvas holds "a"; dragging must move "a", not resurrect "b".
      dispatcher.dispatch({ type: "START_DRAG", activeId: "a", mouse: { x: 360, y: 180 } });
      dispatcher.dispatch({ type: "DRAG_MOVE", mouse: { x: 600, y: 200 } });
      dispatcher.dispatch({ type: "END_DRAG" });
      const ids = manager.getState().cargos.map((c) => c.id);
      expect(ids).toContain("a");
      expect(ids).not.toContain("b");
    });
  });

  describe("gesture-granularity undo", () => {
    it("collapses pointer-move frames into one undo step back to pre-gesture positions", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ id: "m", x: 340, y: 160 })]);
      dispatcher.dispatch({ type: "START_DRAG", activeId: "m", mouse: { x: 360, y: 180 } });
      dispatcher.dispatch({ type: "DRAG_MOVE", mouse: { x: 400, y: 200 } });
      dispatcher.dispatch({ type: "DRAG_MOVE", mouse: { x: 500, y: 220 } });
      dispatcher.dispatch({ type: "DRAG_MOVE", mouse: { x: 520, y: 240 } });
      dispatcher.dispatch({ type: "END_DRAG" });
      dispatcher.dispatch({ type: "UNDO" });
      const restored = manager.getState().cargos[0];
      expect(restored.x).toBe(340);
      expect(restored.y).toBe(160);
    });
  });

  describe("ROTATE", () => {
    it("should rotate item 90 degrees clockwise", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ rotation: 0 })]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      expect(state.cargos[0].rotation).toBe(90);
    });

    it("should rotate 90 to 180", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ rotation: 90 })]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      expect(state.cargos[0].rotation).toBe(180);
    });

    it("should rotate 270 to 0 (wraps around)", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ rotation: 270 })]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      expect(state.cargos[0].rotation).toBe(0);
    });

    it("should preserve item center during rotation", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ x: 400, y: 200, length: 100, width: 50, rotation: 0 }),
      ]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      const item = state.cargos[0];
      // Before: center = (400 + 50, 200 + 25) = (450, 225)
      // After rotation 90: visual size swaps to (50, 100), legal inside the band
      // New position: center - newSize/2 = (450 - 25, 225 - 50) = (425, 175)
      expect(item.x).toBe(425);
      expect(item.y).toBe(175);
      expect(item.rotation).toBe(90);
    });

    it("should preserve center using scale-correct sizes under non-uniform scale", () => {
      const scale = { widthScale: 1453 / 13.6, heightScale: 297 / 2.45 };
      const baseX = 340;
      const baseY = 160;
      const { manager, dispatcher } = createDispatcher(
        [
          createCargoItem({
            x: baseX,
            y: baseY,
            length: 0.3 * scale.widthScale,
            width: 0.2 * scale.heightScale,
          }),
        ],
        scale
      );
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const item = manager.getState().cargos[0];
      // Center preserved from the base orientation footprint
      const centerX = baseX + (0.3 * scale.widthScale) / 2;
      const centerY = baseY + (0.2 * scale.heightScale) / 2;
      // New rotated footprint projected through the matching axis scales
      const nextL = 0.2 * scale.heightScale * (scale.widthScale / scale.heightScale);
      const nextW = 0.3 * scale.widthScale * (scale.heightScale / scale.widthScale);
      expect(item.rotation).toBe(90);
      expect(item.x).toBeCloseTo(centerX - nextL / 2);
      expect(item.y).toBeCloseTo(centerY - nextW / 2);
    });

    it("should not rotate locked items", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ rotation: 0, isLocked: true })]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      expect(state.cargos[0].rotation).toBe(0);
    });

    it("should not affect other items during rotation", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ id: "item1", rotation: 0 }),
        createCargoItem({ id: "item2", x: 200, rotation: 0 }),
      ]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      expect(state.cargos[0].rotation).toBe(90);
      expect(state.cargos[1].rotation).toBe(0);
    });

    it("should keep the rotated item inside the widget canvas", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ x: 950, y: 550, length: 100, width: 50, rotation: 0 }),
      ]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      const item = state.cargos[0];
      expect(item.rotation).toBe(90);
      // Free placement anchors the rotation and clamps it into the canvas (BR-46).
      expect(isInsideBounds(item, getCanvasBounds(canvasWidth, canvasHeight))).toBe(true);
    });

    it("should update validation after rotation", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ rotation: 0 })]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      expect(state.validation).toBeDefined();
    });

    it("should keep the rotated item inside the widget canvas instead of leaving it outside", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ x: 100, y: 60, length: 100, width: 40, rotation: 0 }),
      ]);
      dispatcher.dispatch({ type: "ROTATE", itemId: "item1" });
      const state = manager.getState();
      expect(state.cargos[0].rotation).toBe(90);
      expect(isInsideBounds(state.cargos[0], getCanvasBounds(canvasWidth, canvasHeight))).toBe(true);
      expect(state.validation.valid).toBe(true);
    });
  });

  describe("MOVE_ITEM", () => {
    it("should move the item to the desired free position and clear the active item", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ id: "item1", x: 400, y: 200, length: 50, width: 50 }),
      ]);
      dispatcher.dispatch({ type: "MOVE_ITEM", itemId: "item1", x: 500, y: 250 });
      const state = manager.getState();
      expect(state.cargos[0].x).toBe(500);
      expect(state.cargos[0].y).toBe(250);
      expect(state.activeItemId).toBeNull();
      expect(state.validation.valid).toBe(true);
    });

    it("should settle on an occupied desired position because overlap is allowed", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ id: "item1", x: 400, y: 200, length: 50, width: 50 }),
        createCargoItem({ id: "item2", x: 500, y: 250, length: 50, width: 50 }),
      ]);
      dispatcher.dispatch({ type: "MOVE_ITEM", itemId: "item1", x: 500, y: 250 });
      const state = manager.getState();
      const moved = state.cargos.find((c) => c.id === "item1")!;
      // Free placement (BR-46) keeps the exact released position; the overlap is
      // not reported by interaction-time validation (Verify is the strict gate).
      expect(moved.x).toBe(500);
      expect(moved.y).toBe(250);
      expect(state.validation.valid).toBe(true);
      expect(state.cargos).toHaveLength(2);
    });

    it("should ignore an unknown item id", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ id: "item1", x: 400, y: 200 })]);
      dispatcher.dispatch({ type: "MOVE_ITEM", itemId: "missing", x: 500, y: 250 });
      const state = manager.getState();
      expect(state.cargos[0].x).toBe(400);
      expect(state.cargos[0].y).toBe(200);
    });
  });

  describe("SET_ITEMS", () => {
    it("should replace cargos and evaluate validation against the widget canvas", () => {
      const { manager, dispatcher } = createDispatcher([]);
      dispatcher.dispatch({
        type: "SET_ITEMS",
        items: [createCargoItem({ id: "a", x: 400, y: 200 })],
      });
      const state = manager.getState();
      expect(state.cargos).toHaveLength(1);
      expect(state.validation.valid).toBe(true);
    });

    it("should flag OUT_OF_BOUNDS only when a settled item lies outside the widget canvas", () => {
      const { manager, dispatcher } = createDispatcher([]);
      dispatcher.dispatch({
        type: "SET_ITEMS",
        items: [createCargoItem({ id: "a", x: 990, y: 100, length: 50, width: 50 })],
      });
      const state = manager.getState();
      expect(state.validation.valid).toBe(false);
      expect(state.validation.errors).toContain("OUT_OF_BOUNDS");
    });
  });

  describe("REMOVE_ITEM", () => {
    it("should remove only the item with the exact id", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ id: "cargo-order1-0", x: 100, y: 100 }),
        createCargoItem({ id: "cargo-order1-1", x: 150, y: 100 }), // sibling unit, same order
        createCargoItem({ id: "cargo-order2", x: 200, y: 100 }),
      ]);
      dispatcher.dispatch({ type: "REMOVE_ITEM", itemId: "cargo-order1-0" });
      const state = manager.getState();
      expect(state.cargos.map((c) => c.id)).toEqual(["cargo-order1-1", "cargo-order2"]);
    });

    it("should not affect items with different ids", () => {
      const { manager, dispatcher } = createDispatcher([
        createCargoItem({ id: "cargo-order1", x: 100, y: 100 }),
        createCargoItem({ id: "cargo-order2", x: 200, y: 100 }),
      ]);
      dispatcher.dispatch({ type: "REMOVE_ITEM", itemId: "cargo-order1" });
      const state = manager.getState();
      expect(state.cargos).toHaveLength(1);
      expect(state.cargos[0].id).toBe("cargo-order2");
    });

    it("should update validation after removal", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem({ id: "cargo-order1", x: 100, y: 100 })]);
      dispatcher.dispatch({ type: "REMOVE_ITEM", itemId: "cargo-order1" });
      const state = manager.getState();
      expect(state.cargos).toHaveLength(0);
      expect(state.validation.valid).toBe(true);
    });

    it("should update dragEngine with remaining items", () => {
      const { dispatcher, dragEngine } = createDispatcher([
        createCargoItem({ id: "cargo-order1", x: 100, y: 100 }),
        createCargoItem({ id: "cargo-order2", x: 200, y: 100 }),
      ]);
      const updateItemsSpy = jest.spyOn(dragEngine, "updateItems");
      dispatcher.dispatch({ type: "REMOVE_ITEM", itemId: "cargo-order1" });
      expect(updateItemsSpy).toHaveBeenCalled();
      const updatedItems = updateItemsSpy.mock.calls[0][0];
      expect(updatedItems).toHaveLength(1);
      expect(updatedItems[0].id).toBe("cargo-order2");
    });
  });

  describe("UNDO", () => {
    it("should call manager.undo", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      const undoSpy = jest.spyOn(manager, "undo");
      dispatcher.dispatch({ type: "UNDO" });
      expect(undoSpy).toHaveBeenCalled();
    });
  });

  describe("REDO", () => {
    it("should call manager.redo", () => {
      const { manager, dispatcher } = createDispatcher([createCargoItem()]);
      const redoSpy = jest.spyOn(manager, "redo");
      dispatcher.dispatch({ type: "REDO" });
      expect(redoSpy).toHaveBeenCalled();
    });
  });
});
