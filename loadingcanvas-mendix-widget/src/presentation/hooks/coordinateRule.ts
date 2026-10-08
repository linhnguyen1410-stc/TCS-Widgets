// Converts a browser client coordinate to a canvas-relative coordinate.
// Lives at the hook layer: it depends on the DOM, so it must not sit in domain/.
import type { Point, Size } from "../../core/types/geometry";
import { DEFAULT_ADD_POSITION_X, DEFAULT_ADD_POSITION_Y, OVERFLOW_MARGIN } from "../../core/constants/canvas";
import { clamp } from "../../domain/rules/boundaryRules";

export const getCanvasPoint = (canvas: HTMLDivElement | null, clientX: number, clientY: number): Point => {
  if (!canvas) {
    return { x: 0, y: 0 };
  }
  const rect = canvas.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
};

// Converts a rendered widget-canvas point to a data (scene) point.
// Single conversion for the unified pointer gesture: R -> D = R - S.
export const toDataPoint = (rendered: Point, sceneOffset: Point): Point => {
  return { x: rendered.x - sceneOffset.x, y: rendered.y - sceneOffset.y };
};

// Hit-test for the unified pointer gesture: is the client point over the element.
export const isPointInRect = (clientX: number, clientY: number, el: Element | null): boolean => {
  if (!el) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
};

// Converts a browser drop position into a clamped data (scene) point. The
// rendered rect (data point + sceneOffset) always stays fully inside the
// widget canvas, so a dropped item can always be grabbed and dragged again.
// Anchor is the grab offset inside the card (cursor - card top-left); it
// preserves where the pointer grabbed the card so drop lands under the mouse.
export const getDropDataPoint = (
  clientX: number,
  clientY: number,
  canvas: HTMLDivElement | null,
  sceneOffset: Point,
  size: Size,
  canvasWidth: number,
  canvasHeight: number,
  anchor: Point = { x: 0, y: 0 }
): Point => {
  if (!canvas) {
    return { x: 0, y: 0 };
  }
  const rect = canvas.getBoundingClientRect();
  const renderedX = clamp(clientX - rect.left - anchor.x, 0, canvasWidth - size.length);
  const renderedY = clamp(clientY - rect.top - anchor.y, 0, canvasHeight - size.width);
  return toDataPoint({ x: renderedX, y: renderedY }, sceneOffset);
};

// Default data-space position for click-to-add (no mouse point available).
// Returns the data point rendering at (OVERFLOW_MARGIN, OVERFLOW_MARGIN):
// outside the truck at the widget's top-left, fully visible and grabbable
// even when ADD_ITEM's BR-21 fallback keeps it verbatim (truck full).
// Desired outside bounds also seeds the collision search from the truck
// origin corner, so space-remaining adds still land on the nearest free
// truck spot. Falls back to the legacy default only when there is no truck
// (sceneOffset is then zero, so it is visible).
export const getClickAddDataPoint = (
  truck: { x: number; y: number } | null | undefined,
  sceneOffset: Point = { x: 0, y: 0 }
): Point => {
  if (!truck) {
    return { x: DEFAULT_ADD_POSITION_X, y: DEFAULT_ADD_POSITION_Y };
  }
  return { x: OVERFLOW_MARGIN - sceneOffset.x, y: OVERFLOW_MARGIN - sceneOffset.y };
};
