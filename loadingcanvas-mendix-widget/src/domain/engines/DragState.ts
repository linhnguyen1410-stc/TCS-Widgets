import type { Point } from "../../core/types/geometry";

export interface DragState {
  isDragging: boolean;

  activeId: string | null;

  startMouse: Point;

  // item positions at drag start
  startPositions: Map<string, Point>;

  // pointer offset per item: mouse - item.position at drag start
  startOffsets: Map<string, Point>;
}
