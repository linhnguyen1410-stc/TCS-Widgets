import type { CanvasState } from "./CanvasState";
import type { StateListener } from "./CanvasStateListener";

/**
 * Deep-clone a CanvasState using structuredClone when available,
 * falling back to JSON round-trip for older environments.
 */
function cloneState(state: CanvasState): CanvasState {
  if (typeof structuredClone === "function") {
    return structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state)) as CanvasState;
}

export class CanvasStateManager {
  private state: CanvasState;
  private listeners: Set<StateListener> = new Set();
  private history: CanvasState[] = [];
  private historyIndex = -1;

  constructor(initialState: CanvasState) {
    this.state = cloneState(initialState);
    this.history = [cloneState(initialState)];
    this.historyIndex = 0;
  }

  getState(): CanvasState {
    return cloneState(this.state);
  }

  // Internal non-cloning read for dispatcher/controller hot paths. Callers must
  // not mutate the returned object; it is (a reference to) the live store state.
  peekState(): CanvasState {
    return this.state;
  }

  setState(nextState: CanvasState): void {
    const nextClone = cloneState(nextState);
    this.state = nextClone;
    // Push to history, truncating any redo branch
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(nextClone);
    this.historyIndex = this.history.length - 1;
    this.notifyListeners();
  }

  updateState(update: (state: CanvasState) => CanvasState): void {
    this.setState(update(this.state));
  }

  // High-frequency interaction frames skip history recording, so UNDO
  // granularity stays per gesture instead of per pointer-move event.
  setStateTransient(nextState: CanvasState): void {
    this.state = cloneState(nextState);
    this.notifyListeners();
  }

  updateStateTransient(update: (state: CanvasState) => CanvasState): void {
    this.setStateTransient(update(this.state));
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.state = cloneState(this.history[this.historyIndex]);
      this.notifyListeners();
    }
  }

  redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.state = cloneState(this.history[this.historyIndex]);
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }
}
