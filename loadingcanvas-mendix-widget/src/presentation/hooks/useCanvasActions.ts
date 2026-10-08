import { useCallback } from "react";
import type { CanvasActionDispatcher } from "../../state/CanvasActionDispatcher";
import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import type { Point } from "../../core/types/geometry";

export const useCanvasActions = (
  dispatcher: CanvasActionDispatcher
): {
  startDrag: (itemId: string, mouse: Point) => void;
  dragMove: (mouse: Point) => void;
  endDrag: () => void;
  rotateItem: (itemId: string) => void;
  addItem: (item: CargoItem) => void;
  setItems: (items: CargoItem[]) => void;
  removeItem: (itemId: string) => void;
  deselect: () => void;
} => {
  return {
    startDrag: useCallback(
      (itemId: string, mouse: Point) => {
        dispatcher.dispatch({ type: "START_DRAG", activeId: itemId, mouse });
      },
      [dispatcher]
    ),
    dragMove: useCallback(
      (mouse: Point) => {
        dispatcher.dispatch({ type: "DRAG_MOVE", mouse });
      },
      [dispatcher]
    ),
    endDrag: useCallback(() => {
      dispatcher.dispatch({ type: "END_DRAG" });
    }, [dispatcher]),
    rotateItem: useCallback(
      (itemId: string) => {
        dispatcher.dispatch({ type: "ROTATE", itemId });
      },
      [dispatcher]
    ),
    addItem: useCallback(
      (item: CargoItem) => {
        dispatcher.dispatch({ type: "ADD_ITEM", item });
      },
      [dispatcher]
    ),
    setItems: useCallback(
      (items: CargoItem[]) => {
        dispatcher.dispatch({ type: "SET_ITEMS", items });
      },
      [dispatcher]
    ),
    removeItem: useCallback(
      (itemId: string) => {
        dispatcher.dispatch({ type: "REMOVE_ITEM", itemId });
      },
      [dispatcher]
    ),
    deselect: useCallback(() => {
      dispatcher.dispatch({ type: "DESELECT" });
    }, [dispatcher]),
  };
};
