import type { Point } from "../core/types/geometry";
import type { CargoItem } from "../core/types/viewModels/CargoItem";
import type { CanvasStateManager } from "./CanvasStateManager";
import { getCanvasBounds, getTruckFrontDataX } from "../domain/rules/boundaryRules";
import { validateAll } from "../domain/rules/validationRules";
import { DragEngine } from "../domain/engines/DragEngine";

export type CanvasAction =
  | { type: "SELECT"; ids: string[] }
  | { type: "DESELECT" }
  | { type: "SET_ACTIVE_ITEM"; id: string | null }
  | { type: "START_DRAG"; activeId: string; mouse: Point }
  | { type: "DRAG_MOVE"; mouse: Point }
  | { type: "END_DRAG" }
  | { type: "ROTATE"; itemId: string }
  | { type: "ADD_ITEM"; item: CargoItem }
  | { type: "MOVE_ITEM"; itemId: string; x: number; y: number }
  | { type: "SET_ITEMS"; items: CargoItem[] }
  | { type: "REMOVE_ITEM"; itemId: string }
  | { type: "UNDO" }
  | { type: "REDO" };

interface CanvasActionDispatcherOptions {
  canvasWidth: number;
  canvasHeight: number;
  dragEngine: DragEngine<CargoItem>;
}

/**
 * Helper: build validation options from the current canvas state.
 * Manual interaction runs in free placement (BR-46): overlaps are allowed and
 * bounds are the whole widget canvas. LM constraints (BR-17) still apply; the
 * strict overlap gate is the explicit Verify action (BR-45).
 */
const buildValidationOptions = (state: {
  truck: { maxLoadMeters?: number; length: number; x: number } | null | undefined;
  scale: { widthScale: number; heightScale: number };
}): {
  maxLoadMeters?: number;
  scale: { widthScale: number; heightScale: number };
  allowOverlap: boolean;
  truckFrontDataX: number;
} => ({
  maxLoadMeters: state.truck?.maxLoadMeters,
  scale: state.scale,
  allowOverlap: true,
  truckFrontDataX: getTruckFrontDataX(state.truck ?? null),
});

export class CanvasActionDispatcher {
  private manager: CanvasStateManager;
  private canvasWidth: number;
  private canvasHeight: number;
  private dragEngine: DragEngine<CargoItem>;

  constructor(manager: CanvasStateManager, options: CanvasActionDispatcherOptions) {
    this.manager = manager;
    this.canvasWidth = options.canvasWidth;
    this.canvasHeight = options.canvasHeight;
    this.dragEngine = options.dragEngine;
  }

  dispatch(action: CanvasAction): void {
    const state = this.manager.peekState();

    switch (action.type) {
      case "SELECT":
        this.manager.updateState((current) => ({
          ...current,
          selectedIds: action.ids,
          activeItemId: action.ids.length === 1 ? action.ids[0] : current.activeItemId,
        }));
        break;

      case "DESELECT":
        this.manager.updateState((current) => ({
          ...current,
          selectedIds: [],
          activeItemId: null,
        }));
        break;

      case "SET_ACTIVE_ITEM":
        this.manager.updateState((current) => ({
          ...current,
          activeItemId: action.id,
        }));
        break;

      case "START_DRAG": {
        this.dragEngine.updateItems(state.cargos);
        const selectedIds = state.selectedIds.includes(action.activeId) ? state.selectedIds : [action.activeId];
        this.dragEngine.startDrag(action.activeId, selectedIds, action.mouse);
        this.manager.updateState((current) => ({
          ...current,
          selectedIds,
          activeItemId: action.activeId,
        }));
        break;
      }

      case "DRAG_MOVE": {
        // Free placement (BR-46): the gesture may carry cargo anywhere on the
        // widget canvas, so it is bounded by the canvas instead of the truck band.
        const items = this.dragEngine.move(
          action.mouse,
          this.canvasWidth,
          this.canvasHeight,
          state.scale,
          getCanvasBounds(this.canvasWidth, this.canvasHeight)
        );
        // Note: dragEngine.move() already mutates this.items internally,
        // so no additional updateItems() call is needed here.
        // Transient gesture feedback stays relative to the whole canvas;
        // settled layouts (ROTATE/SET_ITEMS/END_DRAG) are held to the truck band.
        const validation = validateAll(
          items,
          getCanvasBounds(this.canvasWidth, this.canvasHeight),
          buildValidationOptions(state)
        );

        // Per-frame movement skips undo history; granularity is per gesture.
        this.manager.updateStateTransient((current) => ({
          ...current,
          cargos: items,
          validation,
        }));
        break;
      }

      case "END_DRAG": {
        this.dragEngine.endDrag();
        // Free placement (BR-46) keeps settled layouts canvas-bounded too:
        // overlap and out-of-truck parking are accepted while planning. The
        // strict check stays on the explicit Verify action (BR-45).
        const settled = this.manager.peekState();
        const validation = validateAll(
          settled.cargos,
          getCanvasBounds(this.canvasWidth, this.canvasHeight),
          buildValidationOptions(settled)
        );
        this.manager.updateState((current) => ({
          ...current,
          activeItemId: null,
          validation,
        }));
        break;
      }

      case "ROTATE": {
        // Locked items keep their pose; free placement (BR-46) re-anchors the
        // rotation in place, clamped to the widget canvas so it stays visible.
        const target = state.cargos.find((item) => item.id === action.itemId);
        if (!target || target.isLocked) {
          break;
        }

        const rotatedItems = this.dragEngine.rotateItem(
          action.itemId,
          getCanvasBounds(this.canvasWidth, this.canvasHeight),
          state.scale
        );
        this.dragEngine.updateItems(rotatedItems);
        const validation = validateAll(
          rotatedItems,
          getCanvasBounds(this.canvasWidth, this.canvasHeight),
          buildValidationOptions(state)
        );
        this.manager.updateState((current) => ({
          ...current,
          cargos: rotatedItems,
          validation,
        }));
        break;
      }

      case "MOVE_ITEM": {
        // Free placement (BR-46): a settled move keeps the exact released
        // position; overlap resolution is not applied to manual moves.
        const target = state.cargos.find((item) => item.id === action.itemId);
        if (!target) {
          break;
        }
        const updatedCargos = state.cargos.map((item) =>
          item.id === action.itemId ? { ...item, x: action.x, y: action.y } : item
        );
        this.dragEngine.updateItems(updatedCargos);
        const validation = validateAll(
          updatedCargos,
          getCanvasBounds(this.canvasWidth, this.canvasHeight),
          buildValidationOptions(state)
        );
        this.manager.updateState((current) => ({
          ...current,
          cargos: updatedCargos,
          activeItemId: null,
          validation,
        }));
        break;
      }

      case "ADD_ITEM": {
        // Free placement (BR-46): a dropped unit lands exactly where released,
        // even on an occupied spot or outside the truck.
        const newItem = { ...action.item };
        const updatedCargos = [...state.cargos, newItem];
        this.dragEngine.updateItems(updatedCargos);
        const validation = validateAll(
          updatedCargos,
          getCanvasBounds(this.canvasWidth, this.canvasHeight),
          buildValidationOptions(state)
        );
        this.manager.updateState((current) => ({
          ...current,
          cargos: updatedCargos,
          validation,
        }));
        break;
      }

      case "SET_ITEMS": {
        this.dragEngine.updateItems(action.items);
        const validation = validateAll(
          action.items,
          getCanvasBounds(this.canvasWidth, this.canvasHeight),
          buildValidationOptions(state)
        );
        this.manager.updateState((current) => ({
          ...current,
          cargos: action.items,
          validation,
        }));
        break;
      }

      case "REMOVE_ITEM": {
        // Remove exactly the dragged canvas instance (id like "cargo-<guid>-<index>");
        // sibling units of the same transport order stay on the canvas.
        const remainingCargos = state.cargos.filter((item) => item.id !== action.itemId);
        this.dragEngine.updateItems(remainingCargos);
        const validation = validateAll(
          remainingCargos,
          getCanvasBounds(this.canvasWidth, this.canvasHeight),
          buildValidationOptions(state)
        );
        this.manager.updateState((current) => ({
          ...current,
          cargos: remainingCargos,
          validation,
        }));
        break;
      }

      case "UNDO": {
        this.manager.undo();
        this.dragEngine.updateItems(this.manager.peekState().cargos);
        break;
      }

      case "REDO": {
        this.manager.redo();
        this.dragEngine.updateItems(this.manager.peekState().cargos);
        break;
      }

      default:
        break;
    }
  }
}
