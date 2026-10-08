import { useEffect, useState } from "react";
import type { CanvasStateManager } from "../../state/CanvasStateManager";
import type { CanvasState } from "../../state/CanvasState";

export const useCanvasState = (manager: CanvasStateManager): CanvasState => {
  // Use a lazy initializer that calls manager.getState() with correct `this` binding
  const [state, setState] = useState<CanvasState>(() => manager.getState());

  useEffect(() => {
    const unsubscribe = manager.subscribe((currentState) => {
      setState(currentState);
    });
    return unsubscribe;
  }, [manager]);

  return state;
};
