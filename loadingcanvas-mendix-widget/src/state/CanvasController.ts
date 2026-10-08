import type { CargoItem } from "../core/types/viewModels/CargoItem";
import type { TruckItem } from "../core/types/viewModels/TruckItem";
import type { Point } from "../core/types/geometry";
import type { CanvasState } from "./CanvasState";
import { CanvasStateManager } from "./CanvasStateManager";
import { CanvasActionDispatcher, type CanvasAction } from "./CanvasActionDispatcher";
import { DragEngine } from "../domain/engines/DragEngine";
import { CollisionEngine } from "../domain/engines/CollisionEngine";
import { SnapEngine } from "../domain/engines/SnapEngine";

export interface CanvasControllerOptions {
  initialItems: CargoItem[];
  canvasWidth: number;
  canvasHeight: number;
  scale?: { widthScale: number; heightScale: number };
  truck?: TruckItem | null;
}

// Plain-TS interaction machine. Owns the state manager, action dispatcher, and
// the drag/collision/snap engines; exposes the surface the UI needs. Living in
// the State layer makes the whole gesture logic unit-testable without React.
export class CanvasController {
  readonly stateManager: CanvasStateManager;
  readonly dispatcher: CanvasActionDispatcher;
  readonly dragEngine: DragEngine<CargoItem>;
  readonly collisionEngine: CollisionEngine;
  readonly snapEngine: SnapEngine;

  private scale: { widthScale: number; heightScale: number };

  constructor(options: CanvasControllerOptions) {
    this.scale = options.scale ?? { widthScale: 1, heightScale: 1 };
    this.collisionEngine = new CollisionEngine();
    this.snapEngine = new SnapEngine();
    this.dragEngine = new DragEngine<CargoItem>(options.initialItems, this.collisionEngine, this.snapEngine);
    // Free placement (BR-46): manual gestures may overlap and park cargo outside
    // the truck; the strict geometric check is the explicit Verify action (BR-45).
    this.dragEngine.setAllowOverlap(true);
    this.stateManager = new CanvasStateManager(this.createInitialState(options));
    this.dispatcher = new CanvasActionDispatcher(this.stateManager, {
      canvasWidth: options.canvasWidth,
      canvasHeight: options.canvasHeight,
      dragEngine: this.dragEngine,
    });
  }

  getState(): CanvasState {
    return this.stateManager.getState();
  }

  subscribe(listener: (state: CanvasState) => void): () => void {
    return this.stateManager.subscribe(listener);
  }

  dispatch(action: CanvasAction): void {
    this.dispatcher.dispatch(action);
  }

  startDrag(activeId: string, mouse: Point): void {
    this.dispatch({ type: "START_DRAG", activeId, mouse });
  }

  move(mouse: Point): void {
    this.dispatch({ type: "DRAG_MOVE", mouse });
  }

  endDrag(): void {
    this.dispatch({ type: "END_DRAG" });
  }

  rotate(itemId: string): void {
    this.dispatch({ type: "ROTATE", itemId });
  }

  addItem(item: CargoItem): void {
    this.dispatch({ type: "ADD_ITEM", item });
  }

  moveItem(itemId: string, x: number, y: number): void {
    this.dispatch({ type: "MOVE_ITEM", itemId, x, y });
  }

  setItems(items: CargoItem[]): void {
    this.dispatch({ type: "SET_ITEMS", items });
  }

  removeItem(itemId: string): void {
    this.dispatch({ type: "REMOVE_ITEM", itemId });
  }

  undo(): void {
    this.dispatch({ type: "UNDO" });
  }

  redo(): void {
    this.dispatch({ type: "REDO" });
  }

  private createInitialState(options: CanvasControllerOptions): CanvasState {
    return {
      truck: options.truck ?? null,
      cargos: options.initialItems,
      selectedIds: [],
      activeItemId: null,
      validation: { valid: true, errors: [] },
      scale: this.scale,
    };
  }
}
