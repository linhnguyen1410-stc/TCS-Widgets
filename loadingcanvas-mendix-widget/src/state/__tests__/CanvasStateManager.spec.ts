import { describe, it, expect, jest } from "@jest/globals";
import { CanvasStateManager } from "../CanvasStateManager";
import type { CanvasState } from "../CanvasState";

describe("CanvasStateManager", () => {
  const createInitialState = (): CanvasState => ({
    truck: null,
    cargos: [],
    selectedIds: [],
    activeItemId: null,
    validation: { valid: true, errors: [] },
    scale: { widthScale: 1, heightScale: 1 },
  });

  describe("constructor & getState", () => {
    it("should initialize with the provided state", () => {
      const initial = createInitialState();
      const manager = new CanvasStateManager(initial);
      expect(manager.getState()).toEqual(initial);
    });

    it("should return a deep clone (mutations to returned state do not affect internal state)", () => {
      const initial = createInitialState();
      const manager = new CanvasStateManager(initial);
      const state = manager.getState();
      state.cargos.push({
        id: "test",
        x: 0,
        y: 0,
        length: 10,
        width: 10,
        rotation: 0,
        name: "test",
        type: "pallet",
        color: "red",
        isLocked: false,
      });
      // Internal state should be unaffected
      expect(manager.getState().cargos).toHaveLength(0);
    });
  });

  describe("setState", () => {
    it("should update state and notify listeners", () => {
      const manager = new CanvasStateManager(createInitialState());
      const listener = jest.fn();
      manager.subscribe(listener);

      const newState = { ...createInitialState(), activeItemId: "item-1" };
      manager.setState(newState);

      expect(manager.getState().activeItemId).toBe("item-1");
      expect(listener).toHaveBeenCalledTimes(2); // immediate fire + update
    });

    it("should push previous state onto history stack", () => {
      const manager = new CanvasStateManager(createInitialState());

      manager.setState({ ...createInitialState(), activeItemId: "item-1" });

      // Undo should return to first state
      manager.undo();
      expect(manager.getState().activeItemId).toBeNull();
    });

    it("should truncate redo branch when setting new state after undo", () => {
      const manager = new CanvasStateManager(createInitialState());

      // State 1: initial
      // State 2: activeItemId = "a"
      manager.setState({ ...createInitialState(), activeItemId: "a" });
      // State 3: activeItemId = "b"
      manager.setState({ ...createInitialState(), activeItemId: "b" });

      // Undo to state 2
      manager.undo();
      expect(manager.getState().activeItemId).toBe("a");

      // Set new state â€” should truncate redo branch
      manager.setState({ ...createInitialState(), activeItemId: "c" });

      // Redo should NOT go back to "b"
      manager.redo();
      expect(manager.getState().activeItemId).toBe("c");
    });
  });

  describe("setStateTransient", () => {
    it("notifies listeners without recording an undo step", () => {
      const manager = new CanvasStateManager(createInitialState());
      let notified = false;
      manager.subscribe(() => {
        notified = true;
      });

      manager.setStateTransient({ ...createInitialState(), selectedIds: ["transient"] });
      expect(notified).toBe(true);
      expect(manager.getState().selectedIds).toEqual(["transient"]);

      // The transient value must never appear in history: one committed change
      // later, a single undo lands on the pristine initial state.
      manager.setState({ ...createInitialState(), selectedIds: ["committed"] });
      manager.undo();
      expect(manager.getState().selectedIds).toEqual([]);
    });
  });

  describe("updateState", () => {
    it("should apply update function to current state", () => {
      const manager = new CanvasStateManager(createInitialState());
      manager.updateState((state) => ({
        ...state,
        selectedIds: ["item-1", "item-2"],
      }));

      expect(manager.getState().selectedIds).toEqual(["item-1", "item-2"]);
    });

    it("should push to history before applying update", () => {
      const manager = new CanvasStateManager(createInitialState());
      manager.updateState((state) => ({ ...state, activeItemId: "x" }));
      manager.undo();
      expect(manager.getState().activeItemId).toBeNull();
    });
  });

  describe("subscribe", () => {
    it("should immediately fire listener with current state", () => {
      const manager = new CanvasStateManager(createInitialState());
      const listener = jest.fn();
      manager.subscribe(listener);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(createInitialState());
    });

    it("should notify listener on state change", () => {
      const manager = new CanvasStateManager(createInitialState());
      const listener = jest.fn();
      manager.subscribe(listener);
      listener.mockClear();

      manager.setState({ ...createInitialState(), activeItemId: "new" });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should return unsubscribe function that stops notifications", () => {
      const manager = new CanvasStateManager(createInitialState());
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);
      listener.mockClear();

      unsubscribe();
      manager.setState({ ...createInitialState(), activeItemId: "new" });
      expect(listener).not.toHaveBeenCalled();
    });

    it("should notify multiple subscribers", () => {
      const manager = new CanvasStateManager(createInitialState());
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      manager.subscribe(listener1);
      manager.subscribe(listener2);
      listener1.mockClear();
      listener2.mockClear();

      manager.setState({ ...createInitialState(), activeItemId: "new" });
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe("undo", () => {
    it("should revert to previous state", () => {
      const manager = new CanvasStateManager(createInitialState());
      manager.setState({ ...createInitialState(), activeItemId: "a" });
      manager.setState({ ...createInitialState(), activeItemId: "b" });

      manager.undo();
      expect(manager.getState().activeItemId).toBe("a");

      manager.undo();
      expect(manager.getState().activeItemId).toBeNull();
    });

    it("should do nothing when history is empty (at initial state)", () => {
      const manager = new CanvasStateManager(createInitialState());
      const listener = jest.fn();
      manager.subscribe(listener);
      listener.mockClear();

      manager.undo();
      expect(listener).not.toHaveBeenCalled();
    });

    it("should notify listeners on undo", () => {
      const manager = new CanvasStateManager(createInitialState());
      const listener = jest.fn();
      manager.subscribe(listener);
      listener.mockClear();

      manager.setState({ ...createInitialState(), activeItemId: "a" });
      listener.mockClear();

      manager.undo();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("redo", () => {
    it("should re-apply undone state", () => {
      const manager = new CanvasStateManager(createInitialState());
      manager.setState({ ...createInitialState(), activeItemId: "a" });
      manager.undo();
      manager.redo();
      expect(manager.getState().activeItemId).toBe("a");
    });

    it("should do nothing when at the latest state", () => {
      const manager = new CanvasStateManager(createInitialState());
      const listener = jest.fn();
      manager.subscribe(listener);
      listener.mockClear();

      manager.redo();
      expect(listener).not.toHaveBeenCalled();
    });

    it("should notify listeners on redo", () => {
      const manager = new CanvasStateManager(createInitialState());
      const listener = jest.fn();
      manager.subscribe(listener);

      manager.setState({ ...createInitialState(), activeItemId: "a" });
      manager.undo();
      listener.mockClear();

      manager.redo();
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("immutability", () => {
    it("should not share references between states in history", () => {
      const manager = new CanvasStateManager(createInitialState());
      const state1 = manager.getState();

      manager.setState({ ...createInitialState(), activeItemId: "a" });
      const state2 = manager.getState();

      // Mutating state2 should not affect state1
      state2.cargos.push({
        id: "x",
        x: 0,
        y: 0,
        length: 10,
        width: 10,
        rotation: 0,
        name: "x",
        type: "box",
        color: "blue",
        isLocked: false,
      });
      expect(state1.cargos).toHaveLength(0);
    });
  });
});
