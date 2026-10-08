import type { RectLike } from "../../core/types/geometry";
import {
  TRUCK_CANVAS_LEFT,
  TRUCK_CANVAS_TOP,
  TRUCK_CANVAS_WIDTH,
  TRUCK_CANVAS_HEIGHT,
} from "../../core/constants/canvas";

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

// Single authority for interaction bounds. Truck bounds intentionally mirror
// DragEngine's collision band so validation and collision share identical limits.
export const getCanvasBounds = (canvasWidth: number, canvasHeight: number): RectLike => ({
  x: 0,
  y: 0,
  length: canvasWidth,
  width: canvasHeight,
});

export const getTruckBounds = (): RectLike => ({
  x: TRUCK_CANVAS_LEFT,
  y: TRUCK_CANVAS_TOP,
  length: TRUCK_CANVAS_WIDTH,
  width: TRUCK_CANVAS_HEIGHT,
});

// Bounds from the rendered truck item so validation/collision match the
// proportional frame; falls back to the reserved band when no truck exists.
export const getTruckBoundsFromItem = (
  truck: { x: number; y: number; length: number; width: number } | null | undefined
): RectLike => {
  if (!truck) return getTruckBounds();
  return { x: truck.x, y: truck.y, length: truck.length, width: truck.width };
};

// Truck front in data coordinates. With the fixed backdrop, the frame's left
// edge IS the front of the usable loading area, so load meters count from
// truck.x for every truck regardless of its rendered length.
export const getTruckFrontDataX = (truck: { length: number; x: number } | null | undefined): number =>
  truck && truck.length > 0 ? truck.x : 0;
