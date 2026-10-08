import type { Point, RectLike, Rotation } from "../../core/types/geometry";
import type { DragState } from "./DragState";
import type { CollisionEngine } from "./CollisionEngine";
import type { SnapEngine } from "./SnapEngine";
import { calculateDragPosition } from "../rules/dragRules";
import { DEFAULT_AXIS_SCALE, getRotatedScreenSize, rotateKeepingCenter, type AxisScale } from "../rules/rotationRules";
import { clamp, getTruckBounds } from "../rules/boundaryRules";

export class DragEngine<
  T extends RectLike & {
    id: string;
    rotation: Rotation;
  },
> {
  private items: T[];
  private collisionEngine: CollisionEngine | null;
  private snapEngine: SnapEngine | null;
  private allowOverlap = false;

  private state: DragState = {
    isDragging: false,
    activeId: null,
    startMouse: {
      x: 0,
      y: 0,
    },
    startPositions: new Map(),
    startOffsets: new Map(),
  };

  constructor(items: T[], collisionEngine?: CollisionEngine, snapEngine?: SnapEngine) {
    this.items = items;
    this.collisionEngine = collisionEngine ?? null;
    this.snapEngine = snapEngine ?? null;
  }

  // Free placement (BR-46): manual gestures may stack cargo anywhere on the
  // canvas, so collision resolution is bypassed while this is enabled.
  setAllowOverlap(allow: boolean): void {
    this.allowOverlap = allow;
  }

  startDrag(activeId: string, selectedIds: string[], mouse: Point): void {
    const activeItem = this.items.find((item) => item.id === activeId);
    if (!activeItem) {
      return;
    }

    const startPositions = new Map<string, Point>();
    const startOffsets = new Map<string, Point>();

    selectedIds.forEach((id) => {
      const item = this.items.find((x) => x.id === id);
      if (item) {
        startPositions.set(id, {
          x: item.x,
          y: item.y,
        });
        // store pointer offset so dragging keeps cursor relative position
        startOffsets.set(id, {
          x: mouse.x - item.x,
          y: mouse.y - item.y,
        });
      }
    });

    this.state = {
      isDragging: true,
      activeId,
      startMouse: mouse,
      startPositions,
      startOffsets,
    };
  }

  move(
    mouse: Point,
    canvasWidth: number,
    canvasHeight: number,
    scale: AxisScale = DEFAULT_AXIS_SCALE,
    bounds?: RectLike
  ): T[] {
    if (!this.state.isDragging) {
      return this.items;
    }

    const dragBounds = bounds ?? getTruckBounds();

    const targetItems = this.items.map((item) => {
      const offset = this.state.startOffsets.get(item.id);
      if (!offset) {
        return item;
      }

      // compute base position maintaining the initial cursor offset
      const baseX = mouse.x - offset.x;
      const baseY = mouse.y - offset.y;

      const basePosition = calculateDragPosition(item, { x: baseX, y: baseY }, 0, 0, canvasWidth, canvasHeight);

      const startPos = this.state.startPositions.get(item.id) ?? { x: item.x, y: item.y };
      const others = this.items.filter((other) => other.id !== item.id);

      let targetPos = { x: basePosition.x, y: basePosition.y };

      // Apply snapping rules if snap engine is active
      if (this.snapEngine) {
        const snapTarget = this.snapEngine.calculateSnapTarget(item, others, targetPos, {
          bounds: dragBounds,
          scale,
        });
        targetPos = snapTarget.position;
      }

      // Resolve collision overlaps if collision engine is active
      if (this.collisionEngine && !this.allowOverlap) {
        targetPos = this.collisionEngine.resolveNonOverlappingPosition(
          item,
          targetPos,
          startPos,
          others,
          dragBounds,
          scale
        );
      }

      return { ...item, x: targetPos.x, y: targetPos.y } as T;
    });

    this.items = targetItems;
    return this.items;
  }

  rotateItem(itemId: string, bounds?: RectLike, scale: AxisScale = DEFAULT_AXIS_SCALE): T[] {
    const target = this.items.find((item) => item.id === itemId);
    if (!target) {
      return this.items;
    }

    const rotated = rotateKeepingCenter(target, scale);
    const startPos = { x: target.x, y: target.y };
    let position = { x: rotated.x, y: rotated.y };
    let finalRotation = rotated.rotation;

    if (this.allowOverlap) {
      // Free placement rotates in place and only clamps the rotated footprint
      // back inside the band, so a rotation cannot push the item off-canvas.
      const visual = getRotatedScreenSize({ length: target.length, width: target.width }, rotated.rotation, scale);
      const band = bounds ?? getTruckBounds();
      position = {
        x: clamp(position.x, band.x, band.x + band.length - visual.length),
        y: clamp(position.y, band.y, band.y + band.width - visual.width),
      };
    } else if (this.collisionEngine) {
      const resolved = this.collisionEngine.resolveNonOverlappingPosition(
        { ...target, rotation: rotated.rotation },
        position,
        startPos,
        this.items.filter((other) => other.id !== itemId),
        bounds ?? getTruckBounds(),
        scale
      );
      if (resolved !== startPos) {
        position = resolved;
      } else {
        // No collision-free placement found: keep the entire previous pose.
        position = startPos;
        finalRotation = target.rotation;
      }
    }

    return this.items.map((item) =>
      item.id === itemId ? ({ ...item, x: position.x, y: position.y, rotation: finalRotation } as T) : item
    );
  }

  endDrag(): void {
    // Reset drag status and clear starting positions/offsets
    this.state.isDragging = false;
    this.state.activeId = null;
    this.state.startPositions.clear();
    this.state.startOffsets.clear();
  }

  updateItems(items: T[]): void {
    this.items = items;
  }

  isDragging(): boolean {
    return this.state.isDragging;
  }
}
