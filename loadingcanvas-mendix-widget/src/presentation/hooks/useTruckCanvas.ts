import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import type { TruckItem } from "../../core/types/viewModels/TruckItem";
import { CanvasController } from "../../state/CanvasController";
import { makeInstanceId } from "../../core/utils/cargoId";
import { getRotatedScreenSize } from "../../domain/rules/rotationRules";
import { useCanvasState } from "./useCanvasState";
import { getCanvasPoint, toDataPoint, isPointInRect, getDropDataPoint } from "./coordinateRule";

// Parameter defaults must be module-scope: a fresh object literal per call would
// re-key the controller useMemo below (render -> new manager -> subscribe ->
// setState -> render) until React throws "Maximum update depth exceeded".
const DEFAULT_SCALE = { widthScale: 1, heightScale: 1 };
const DEFAULT_SCENE_OFFSET = { x: 0, y: 0 };

export interface UseTruckCanvasProps {
  initialItems: CargoItem[];
  canvasWidth: number;
  canvasHeight: number;
  canvasRef: RefObject<HTMLDivElement | null>;
  scale?: { widthScale: number; heightScale: number };
  truck?: TruckItem | null;
  sceneOffset?: { x: number; y: number };
  listPanelRef?: RefObject<HTMLDivElement | null>;
  // Called when an item is dropped on the list panel (canvas->list return)
  onItemRemoved?: (itemId: string) => void;
}

export interface UseTruckCanvasResult {
  items: CargoItem[];
  activeItemId: string | null;
  selectedIds: string[];
  validation: { valid: boolean; errors: string[]; itemErrors?: Record<string, string[]> };
  handlePointerDown: (e: ReactPointerEvent, itemId: string) => void;
  handlePointerMove: (e: ReactPointerEvent) => void;
  handlePointerUp: (e: ReactPointerEvent) => void;
  handlePointerCancel: () => void;
  handleCanvasMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => void;
  handleRotate: (itemId: string) => void;
  addItem: (item: CargoItem) => void;
  moveItem: (itemId: string, x: number, y: number) => void;
  setItems: (items: CargoItem[]) => void;
  removeItem: (itemId: string) => void;
  onPointerDragStart: (e: ReactPointerEvent, cargo: CargoItem, instanceIndex: number) => void;
  // Ghost shown while a list chip is dragged: keeps cargo visibly attached to the cursor until the drop. Null when not dragging from the list.
  dragPreview: { cargo: CargoItem; x: number; y: number } | null;
  // True right after a real list->canvas drag (moved past threshold): swallows
  // the trailing click that pointer capture retargets onto the source chip.
  shouldSuppressClick: () => boolean;
}

export const useTruckCanvas = ({
  initialItems,
  canvasWidth,
  canvasHeight,
  canvasRef,
  scale = DEFAULT_SCALE,
  truck = null,
  sceneOffset = DEFAULT_SCENE_OFFSET,
  listPanelRef,
  onItemRemoved,
}: UseTruckCanvasProps): UseTruckCanvasResult => {
  // Dataset identity change produces a fresh controller: the single restore
  // mechanism for the whole interaction machine (manager + dispatcher + engines).
  // Key on scale VALUES, not object identity: a caller rebuilding an equal
  // scale object each render must not recreate the whole interaction machine.
  const { widthScale, heightScale } = scale;
  const controller = useMemo(
    () =>
      new CanvasController({
        initialItems,
        canvasWidth,
        canvasHeight,
        scale: { widthScale, heightScale },
        truck,
      }),
    [initialItems, canvasWidth, canvasHeight, widthScale, heightScale, truck]
  );

  const state = useCanvasState(controller.stateManager);
  const [dragging, setDragging] = useState(false);
  // Ref twin of `dragging` for control flow: memoized children capture stale
  // closures, so guards/branches must read the live value, never render state.
  const draggingRef = useRef(false);
  const setGestureActive = useCallback((active: boolean): void => {
    draggingRef.current = active;
    setDragging(active);
  }, []);
  // Grab offset inside the card at pointer-down (cursor - card top-left,
  // rendered coords). The unified pointer gesture re-applies it on move/up so
  // the card stays under the cursor instead of jumping top-left to the mouse.
  const grabRef = useRef({ x: 0, y: 0 });
  // Pending add from cargo list: tracks cargo being dragged from list to canvas
  const pendingAddRef = useRef<{ cargo: CargoItem; grab: { x: number; y: number } } | null>(null);
  // Movement tracking for click-vs-drag disambiguation on list chips.
  const downPosRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  // Below this distance a chip press+release is a click (add), not a drag.
  const CLICK_DRAG_THRESHOLD = 4;
  // Live ghost for a list-chip drag: the pending unit is not in canvas state,
  // so DragEngine renders nothing while it is carried. The view renders this
  // inside the shifted cards layer, following the same clamped drop point used
  // on release so the preview never disagrees with the drop.
  const [dragPreview, setDragPreview] = useState<{ cargo: CargoItem; x: number; y: number } | null>(null);

  // Rendered widget-canvas point -> data (scene) point: single R - S conversion
  // for the unified pointer gesture (engines stay in pure data space).
  const toData = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      return toDataPoint(getCanvasPoint(canvasRef.current, clientX, clientY), sceneOffset);
    },
    [canvasRef, sceneOffset]
  );

  // Single source of truth for where a list-chip drag lands: the rendered
  // footprint is clamped fully inside the widget canvas (BR-30b) and the grab
  // offset is preserved, so the preview and the release point never disagree.
  const computeDropPoint = useCallback(
    (cargo: CargoItem, grab: { x: number; y: number }, clientX: number, clientY: number): { x: number; y: number } => {
      const visual = getRotatedScreenSize({ length: cargo.length, width: cargo.width }, cargo.rotation, {
        widthScale,
        heightScale,
      });
      return getDropDataPoint(
        clientX,
        clientY,
        canvasRef.current,
        sceneOffset,
        visual,
        canvasWidth,
        canvasHeight,
        grab
      );
    },
    [canvasRef, sceneOffset, canvasWidth, canvasHeight, widthScale, heightScale]
  );

  const startDrag = useCallback(
    (activeId: string, mouse: { x: number; y: number }): void => {
      controller.startDrag(activeId, mouse);
      setGestureActive(true);
    },
    [controller, setGestureActive]
  );

  const finish = useCallback((): void => {
    controller.endDrag();
    setGestureActive(false);
  }, [controller, setGestureActive]);

  // Unified pointer gesture: pointerdown starts the drag, pointermove/up
  // stream while captured (mouse + touch + pen). No parallel mouse path.
  const handlePointerDown = useCallback(
    (e: ReactPointerEvent, itemId: string): void => {
      e.stopPropagation();
      if (draggingRef.current) {
        return;
      }
      // Defensive: a leaked pending gesture must never brick later gestures.
      pendingAddRef.current = null;
      downPosRef.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const rendered = getCanvasPoint(canvasRef.current, e.clientX, e.clientY);
      const data = toDataPoint(rendered, sceneOffset);
      const item = controller.getState().cargos.find((c) => c.id === itemId);
      grabRef.current = item
        ? { x: rendered.x - (item.x + sceneOffset.x), y: rendered.y - (item.y + sceneOffset.y) }
        : { x: 0, y: 0 };
      startDrag(itemId, { x: data.x - grabRef.current.x, y: data.y - grabRef.current.y });
    },
    [canvasRef, sceneOffset, controller, startDrag]
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent): void => {
      if (!draggingRef.current && !pendingAddRef.current) {
        return;
      }
      // Past the threshold this press is a drag: suppress the trailing click
      // that pointer capture will retarget onto the source chip/card.
      const down = downPosRef.current;
      const moved = !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_DRAG_THRESHOLD;
      if (down && moved) {
        suppressClickRef.current = true;
      }
      if (pendingAddRef.current) {
        // List-chip drag: the carried unit is not in canvas state (DragEngine
        // has nothing live), so nothing would follow the cursor. Keep a ghost
        // glued to the clamped drop point instead.
        if (!moved) {
          setDragPreview(null);
        } else {
          const { cargo, grab } = pendingAddRef.current;
          const overList = listPanelRef?.current && isPointInRect(e.clientX, e.clientY, listPanelRef.current);
          setDragPreview(overList ? null : { cargo, ...computeDropPoint(cargo, grab, e.clientX, e.clientY) });
        }
      } else {
        // Compute current data point for canvas drag
        const rendered = getCanvasPoint(canvasRef.current, e.clientX, e.clientY);
        const data = toDataPoint(rendered, sceneOffset);
        controller.move({ x: data.x - grabRef.current.x, y: data.y - grabRef.current.y });
      }
    },
    [controller, toData, computeDropPoint, listPanelRef]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent): void => {
      if (!draggingRef.current && !pendingAddRef.current) {
        return;
      }
      // Cleanup always runs (finally): an exception in addItem/removeItem must
      // never leave pendingAddRef/dragging set â€” that bricked every later drag.
      try {
        const clientX = e.clientX;
        const clientY = e.clientY;
        const isOverList = listPanelRef?.current && isPointInRect(clientX, clientY, listPanelRef.current);

        if (pendingAddRef.current) {
          // Dropping a cargo from list
          const { cargo, grab } = pendingAddRef.current;
          if (isOverList) {
            // Dropped back on list - cancel
            setGestureActive(false);
          } else if (suppressClickRef.current) {
            // Real drag onto the canvas - add at the same clamped point the
            // ghost showed (grab preserved). Preview and drop never disagree.
            const drop = computeDropPoint(cargo, grab, clientX, clientY);
            controller.addItem({ ...cargo, x: drop.x, y: drop.y });
          }
          // else: plain click (no movement) - the chip's onClick adds it
        } else if (draggingRef.current) {
          // Moving existing card - check if dropped on list panel (canvas->list return)
          if (isOverList) {
            const activeId = state.activeItemId;
            controller.endDrag();
            setGestureActive(false);
            if (activeId) {
              controller.removeItem(activeId);
              onItemRemoved?.(activeId);
            }
          } else {
            // Dropped on canvas - finish gesture
            finish();
          }
        }
      } finally {
        pendingAddRef.current = null;
        downPosRef.current = null;
        setDragPreview(null);
        if (suppressClickRef.current) {
          // Swallow only the trailing click of this gesture; clear for the next.
          setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }
      }
    },
    [finish, listPanelRef, toData, controller, state.activeItemId, onItemRemoved, setGestureActive]
  );

  // Interrupted gesture (browser takeover, tab switch): release everything so
  // the next pointerdown always starts clean.
  const handlePointerCancel = useCallback((): void => {
    if (draggingRef.current) {
      controller.endDrag();
    }
    setGestureActive(false);
    pendingAddRef.current = null;
    downPosRef.current = null;
    suppressClickRef.current = false;
    setDragPreview(null);
  }, [controller, setGestureActive]);

  const handleCanvasMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>): void => {
      // pointerdown.stopPropagation does not stop the follow-up native mousedown.
      // A press on a card or list chip bubbles here after START_DRAG set
      // activeItemId; DESELECTing would null it and the pointerup removal
      // branch (B-0012) would skip removeItem. Only empty background deselects.
      const target = e.target as Element | null;
      if (target?.closest("[data-id]") || listPanelRef?.current?.contains(target)) {
        return;
      }
      controller.dispatcher.dispatch({ type: "DESELECT" });
    },
    [controller, listPanelRef]
  );

  const onPointerDragStart = useCallback(
    (e: ReactPointerEvent, cargo: CargoItem, instanceIndex: number): void => {
      e.stopPropagation();
      if (draggingRef.current) {
        return;
      }
      // Defensive: overwriting any leaked pending gesture starts a fresh one.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const itemRect = e.currentTarget.getBoundingClientRect();
      // Grab offset inside chip (rendered coords)
      const grab = { x: e.clientX - itemRect.left, y: e.clientY - itemRect.top };
      downPosRef.current = { x: e.clientX, y: e.clientY };
      // Unique instance id (same scheme as click-add) so numbering and
      // canvas->list return keep working per unit of the transport order.
      const pendingCargo = { ...cargo, quantity: 1, id: makeInstanceId(cargo.id, instanceIndex) };
      pendingAddRef.current = { cargo: pendingCargo, grab };
      // Show ghost preview immediately at the starting position (clamped to canvas)
      setDragPreview({ cargo: pendingCargo, ...computeDropPoint(pendingCargo, grab, e.clientX, e.clientY) });
    },
    [computeDropPoint]
  );

  const shouldSuppressClick = useCallback((): boolean => suppressClickRef.current, []);

  const handleRotate = useCallback((itemId: string): void => controller.rotate(itemId), [controller]);
  const addItem = useCallback((item: CargoItem): void => controller.addItem(item), [controller]);
  const moveItem = useCallback(
    (itemId: string, x: number, y: number): void => controller.moveItem(itemId, x, y),
    [controller]
  );
  const setItems = useCallback((items: CargoItem[]): void => controller.setItems(items), [controller]);
  const removeItem = useCallback((itemId: string): void => controller.removeItem(itemId), [controller]);

  return {
    items: state.cargos,
    activeItemId: state.activeItemId,
    selectedIds: state.selectedIds,
    validation: state.validation,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleCanvasMouseDown,
    handleRotate,
    addItem,
    moveItem,
    setItems,
    removeItem,
    onPointerDragStart,
    shouldSuppressClick,
    dragPreview,
  };
};
