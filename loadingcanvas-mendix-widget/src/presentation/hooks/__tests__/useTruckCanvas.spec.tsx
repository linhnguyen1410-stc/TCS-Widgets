import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import type { CargoItem } from "../../../core/types/viewModels/CargoItem";
import { makeInstanceId } from "../../../core/utils/cargoId";
import { useTruckCanvas } from "../useTruckCanvas";

const makeCargo = (id: string): CargoItem => ({
  id,
  name: "Pallet A",
  type: "pallet",
  color: "#777788",
  isLocked: false,
  x: 0,
  y: 0,
  length: 120,
  width: 80,
  rotation: 0,
  quantity: 1,
  transportOrderNo: "TO-1",
  productName: "Widget",
  producerName: "P",
  companyFromName: "F",
  companyToName: "T",
});

const makeItem = (id: string, x: number, y: number): CargoItem => ({ ...makeCargo(id), x, y });

interface Harness {
  canvas: HTMLDivElement;
  canvasRef: { current: HTMLDivElement | null };
  listPanelRef: { current: HTMLDivElement | null };
}

const setup = (): Harness => {
  const canvas = document.createElement("div");
  document.body.appendChild(canvas);
  const canvasRef: { current: HTMLDivElement | null } = { current: canvas };
  const listPanelRef: { current: HTMLDivElement | null } = { current: null };
  return { canvas, canvasRef, listPanelRef };
};

const pe = (target: Element, clientX: number, clientY: number): ReactPointerEvent =>
  ({
    stopPropagation: () => undefined,
    currentTarget: target,
    pointerId: 1,
    clientX,
    clientY,
  }) as unknown as ReactPointerEvent;

describe("useTruckCanvas unified pointer gesture (B-0011)", () => {
  it("adds a chip by drag, then a card drag still moves (no stuck gesture)", () => {
    const { canvas, canvasRef, listPanelRef } = setup();
    // Stable identity across renders: an inline [] literal would re-key the
    // controller useMemo every render and loop (Maximum update depth exceeded).
    const initialItems: CargoItem[] = [];
    const { result } = renderHook(() =>
      useTruckCanvas({ initialItems, canvasWidth: 800, canvasHeight: 600, canvasRef, listPanelRef })
    );

    const chip = document.createElement("div");
    document.body.appendChild(chip);
    const expectedId = makeInstanceId("cargo-G1", 0);

    // list -> canvas drag (moved past threshold, released over the canvas)
    act(() => result.current.onPointerDragStart(pe(chip, 10, 10), makeCargo("cargo-G1"), 0));
    act(() => result.current.handlePointerMove(pe(chip, 120, 120)));
    act(() => result.current.handlePointerUp(pe(canvas, 60, 60)));

    expect(result.current.items.map((i) => i.id)).toContain(expectedId);

    // Regression: after the drop, a card drag must still start and move.
    const xBeforeDrag = result.current.items.find((i) => i.id === expectedId)?.x;
    act(() => result.current.handlePointerDown(pe(canvas, 45, 45), expectedId));
    act(() => result.current.handlePointerMove(pe(canvas, 300, 300)));
    act(() => result.current.handlePointerUp(pe(canvas, 300, 300)));

    const finalItem = result.current.items.find((i) => i.id === expectedId);
    expect(finalItem).toBeDefined();
    expect(finalItem?.x).not.toBe(xBeforeDrag);
    // Gesture fully released: another pointerdown must be accepted.
    act(() => result.current.handlePointerDown(pe(canvas, 10, 10), expectedId));
    act(() => result.current.handlePointerMove(pe(canvas, 50, 50)));
    expect(result.current.activeItemId).toBe(expectedId);
    act(() => result.current.handlePointerUp(pe(canvas, 50, 50)));
  });

  it("pointerCancel clears the gesture so the next drag still works", () => {
    const { canvas, canvasRef, listPanelRef } = setup();
    const initialItems = [makeItem("cargo-A", 40, 40)];
    const { result } = renderHook(() =>
      useTruckCanvas({ initialItems, canvasWidth: 800, canvasHeight: 600, canvasRef, listPanelRef })
    );

    // Chip gesture interrupted mid-drag (browser takeover).
    const chip = document.createElement("div");
    document.body.appendChild(chip);
    act(() => result.current.onPointerDragStart(pe(chip, 10, 10), makeCargo("cargo-G2"), 0));
    act(() => result.current.handlePointerCancel());

    // The existing card must still be draggable afterwards (not bricked).
    act(() => result.current.handlePointerDown(pe(canvas, 50, 50), "cargo-A"));
    act(() => result.current.handlePointerMove(pe(canvas, 250, 250)));
    expect(result.current.activeItemId).toBe("cargo-A");
    act(() => result.current.handlePointerUp(pe(canvas, 250, 250)));

    expect(result.current.activeItemId).toBeNull();
  });

  it("bubbled mousedown on a card does not DESELECT, so drop on the list removes it (B-0012)", () => {
    const { canvas, canvasRef, listPanelRef } = setup();
    const initialItems = [makeItem("cargo-A", 40, 40)];
    const { result } = renderHook(() =>
      useTruckCanvas({ initialItems, canvasWidth: 800, canvasHeight: 600, canvasRef, listPanelRef })
    );

    // Card markup: inner div without data-id nested inside the data-id root,
    // exactly as CargoCard renders — the bubbled mousedown target is the child.
    const cardRoot = document.createElement("div");
    cardRoot.setAttribute("data-id", "cargo-A");
    const cardInner = document.createElement("div");
    cardRoot.appendChild(cardInner);
    document.body.appendChild(cardRoot);
    const me = (target: Element): ReactMouseEvent<HTMLDivElement> =>
      ({
        target,
        stopPropagation: () => undefined,
        currentTarget: canvas,
      }) as unknown as ReactMouseEvent<HTMLDivElement>;

    // Real event order: pointerdown (START_DRAG) then the follow-up mousedown
    // bubbles to the canvas root.
    act(() => result.current.handlePointerDown(pe(cardInner, 50, 50), "cargo-A"));
    expect(result.current.activeItemId).toBe("cargo-A");
    act(() => result.current.handleCanvasMouseDown(me(cardInner)));
    // The press must not wipe START_DRAG's activeItemId (the old DESELECT leak).
    expect(result.current.activeItemId).toBe("cargo-A");

    // Drop over the cargo list panel -> removeItem uses activeItemId.
    const panel = document.createElement("div");
    panel.getBoundingClientRect = () =>
      ({ left: 700, top: 0, right: 800, bottom: 600, width: 100, height: 600, x: 700, y: 0 }) as DOMRect;
    document.body.appendChild(panel);
    listPanelRef.current = panel;
    act(() => result.current.handlePointerMove(pe(canvas, 750, 100)));
    act(() => result.current.handlePointerUp(pe(canvas, 750, 100)));

    expect(result.current.items.map((i) => i.id)).not.toContain("cargo-A");
    expect(result.current.activeItemId).toBeNull();
  });

  it("mousedown on empty canvas still deselects (background press)", () => {
    const { canvas, canvasRef, listPanelRef } = setup();
    const initialItems = [makeItem("cargo-A", 40, 40)];
    const { result } = renderHook(() =>
      useTruckCanvas({ initialItems, canvasWidth: 800, canvasHeight: 600, canvasRef, listPanelRef })
    );

    const me = (target: Element): ReactMouseEvent<HTMLDivElement> =>
      ({
        target,
        stopPropagation: () => undefined,
        currentTarget: canvas,
      }) as unknown as ReactMouseEvent<HTMLDivElement>;
    act(() => result.current.handlePointerDown(pe(canvas, 50, 50), "cargo-A"));
    expect(result.current.activeItemId).toBe("cargo-A");
    // Press the bare canvas background (not a card, not the list panel).
    act(() => result.current.handleCanvasMouseDown(me(canvas)));
    expect(result.current.activeItemId).toBeNull();
    act(() => result.current.handlePointerUp(pe(canvas, 50, 50)));
  });
});
