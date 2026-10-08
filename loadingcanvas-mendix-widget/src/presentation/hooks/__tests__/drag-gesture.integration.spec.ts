import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { act } from "@testing-library/react";
import React from "react";
import { useTruckCanvas } from "../useTruckCanvas";
import { CargoItem } from "../../../core/types/viewModels/CargoItem";
import { renderHook } from "@testing-library/react";

describe("Integration: Drag Gesture Flow (Hook → Controller → Engines)", () => {
  let canvasRef: { current: HTMLDivElement | null };
  let listPanelRef: { current: HTMLDivElement | null };

  beforeEach(() => {
    const canvas = document.createElement("div");
    document.body.appendChild(canvas);
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 1800,
      bottom: 600,
      width: 1800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    canvasRef = { current: canvas };
    listPanelRef = { current: null };
  });

  const makeCargo = (id: string, x = 100, y = 100): CargoItem => ({
    id,
    name: "Pallet",
    type: "pallet" as "pallet" | "box",
    color: "orange",
    isLocked: false,
    x,
    y,
    length: 120,
    width: 80,
    rotation: 0,
    quantity: 1,
  });

  const makeRect = (left: number, top: number, right: number, bottom: number): DOMRect => ({
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => {},
  });

  const makePointerEvent = (overrides: Partial<React.PointerEvent> = {}): React.PointerEvent =>
    ({
      clientX: 0,
      clientY: 0,
      stopPropagation: () => {},
      currentTarget: null as unknown as EventTarget,
      pointerId: 1,
      ...overrides,
    }) as React.PointerEvent;

  const assertCanvas = (): HTMLDivElement => {
    if (!canvasRef.current) throw new Error("canvasRef is null");
    return canvasRef.current;
  };

  it("drags a canvas card: hook → dispatcher → dragEngine → collisionEngine → state", () => {
    const initialItems: CargoItem[] = [makeCargo("cargo-1", 100, 100)];

    const { result } = renderHook(() =>
      useTruckCanvas({
        initialItems,
        canvasWidth: 1800,
        canvasHeight: 600,
        canvasRef,
        scale: { widthScale: 100, heightScale: 100 },
      })
    );

    const card = document.createElement("div");
    card.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      right: 220,
      bottom: 180,
      width: 120,
      height: 80,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    // 1. pointerdown on card
    act(() =>
      result.current.handlePointerDown(
        makePointerEvent({ clientX: 150, clientY: 140, currentTarget: card, pointerId: 1 }),
        "cargo-1"
      )
    );
    expect(result.current.activeItemId).toBe("cargo-1");

    // 2. pointermove (drag)
    act(() =>
      result.current.handlePointerMove(
        makePointerEvent({ clientX: 300, clientY: 200, currentTarget: card, pointerId: 1 })
      )
    );

    // Item moved, snapped to grid (20px)
    const movedItem = result.current.items.find((i: CargoItem) => i.id === "cargo-1");
    expect(movedItem).toBeDefined();
    expect(movedItem!.x).not.toBe(100);
    expect(movedItem!.x % 20).toBe(0);
    expect(movedItem!.y % 20).toBe(0);

    // 3. pointerup (drop)
    act(() =>
      result.current.handlePointerUp(
        makePointerEvent({ clientX: 300, clientY: 200, currentTarget: assertCanvas(), pointerId: 1 })
      )
    );

    expect(result.current.activeItemId).toBeNull();
    // State committed (history recorded)
    const finalItem = result.current.items.find((i: CargoItem) => i.id === "cargo-1");
    expect(finalItem!.x).toBe(movedItem!.x);
  });

  it("drags from list chip → canvas: onPointerDragStart → handlePointerMove → handlePointerUp → addItem", () => {
    const initialItems: CargoItem[] = [];

    const { result } = renderHook(() =>
      useTruckCanvas({
        initialItems,
        canvasWidth: 1800,
        canvasHeight: 600,
        canvasRef,
        listPanelRef,
        scale: { widthScale: 100, heightScale: 100 },
      })
    );

    const chip = document.createElement("div");
    document.body.appendChild(chip);
    chip.getBoundingClientRect = () => ({
      left: 10,
      top: 10,
      right: 40,
      bottom: 40,
      width: 30,
      height: 30,
      x: 10,
      y: 10,
      toJSON: () => {},
    });

    const cargo = makeCargo("cargo-G1");

    // 1. Start drag from list chip
    act(() =>
      result.current.onPointerDragStart(
        makePointerEvent({ clientX: 20, clientY: 20, currentTarget: chip, pointerId: 1 }),
        cargo,
        0
      )
    );

    // Ghost preview shown
    expect(result.current.dragPreview).not.toBeNull();
    expect(result.current.dragPreview!.cargo.id).toBe("cargo-G1-0");

    // 2. Move over canvas
    act(() =>
      result.current.handlePointerMove(
        makePointerEvent({ clientX: 300, clientY: 200, currentTarget: chip, pointerId: 1 })
      )
    );

    // 3. Drop on canvas
    act(() =>
      result.current.handlePointerUp(
        makePointerEvent({ clientX: 300, clientY: 200, currentTarget: assertCanvas(), pointerId: 1 })
      )
    );

    // Item added to canvas
    expect(result.current.items.map((i: CargoItem) => i.id)).toContain("cargo-G1-0");
    expect(result.current.dragPreview).toBeNull();
  });

  it("drags canvas card → list panel: removeItem called with exact instance id", () => {
    const initialItems: CargoItem[] = [makeCargo("cargo-A", 100, 100)];
    const onItemRemoved = jest.fn();

    const { result } = renderHook(() =>
      useTruckCanvas({
        initialItems,
        canvasWidth: 1800,
        canvasHeight: 600,
        canvasRef,
        listPanelRef,
        scale: { widthScale: 100, heightScale: 100 },
        onItemRemoved,
      })
    );

    const panel = document.createElement("div");
    panel.getBoundingClientRect = () => ({
      left: 1700,
      top: 0,
      right: 1800,
      bottom: 600,
      width: 100,
      height: 600,
      x: 1700,
      y: 0,
      toJSON: () => {},
    });
    document.body.appendChild(panel);
    listPanelRef.current = panel;

    const card = document.createElement("div");
    card.setAttribute("data-id", "cargo-A");
    card.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      right: 220,
      bottom: 180,
      width: 120,
      height: 80,
      x: 100,
      y: 100,
      toJSON: () => {},
    });
    document.body.appendChild(card);

    // Start drag on card
    act(() =>
      result.current.handlePointerDown(
        makePointerEvent({ clientX: 150, clientY: 140, currentTarget: card, pointerId: 1 }),
        "cargo-A"
      )
    );

    // Move over list panel
    act(() =>
      result.current.handlePointerMove(
        makePointerEvent({ clientX: 1750, clientY: 100, currentTarget: card, pointerId: 1 })
      )
    );

    // Drop on list panel
    act(() =>
      result.current.handlePointerUp(
        makePointerEvent({ clientX: 1750, clientY: 100, currentTarget: assertCanvas(), pointerId: 1 })
      )
    );

    // Item removed from canvas
    expect(result.current.items.map((i: CargoItem) => i.id)).not.toContain("cargo-A");
    expect(onItemRemoved).toHaveBeenCalledWith("cargo-A");
  });

  it("pointerCancel resets gesture state cleanly", () => {
    const initialItems: CargoItem[] = [makeCargo("cargo-A", 100, 100)];

    const { result } = renderHook(() =>
      useTruckCanvas({
        initialItems,
        canvasWidth: 1800,
        canvasHeight: 600,
        canvasRef,
        listPanelRef,
        scale: { widthScale: 100, heightScale: 100 },
      })
    );

    const card = document.createElement("div");
    card.getBoundingClientRect = () => ({
      left: 100,
      top: 100,
      right: 220,
      bottom: 180,
      width: 120,
      height: 80,
      x: 100,
      y: 100,
      toJSON: () => {},
    });
    document.body.appendChild(card);

    // Start drag
    act(() =>
      result.current.handlePointerDown(
        makePointerEvent({ clientX: 150, clientY: 140, currentTarget: card, pointerId: 1 }),
        "cargo-A"
      )
    );
    expect(result.current.activeItemId).toBe("cargo-A");

    // Cancel (browser takeover, tab switch)
    act(() => result.current.handlePointerCancel());

    // Gesture fully reset
    expect(result.current.activeItemId).toBeNull();
    expect(result.current.dragPreview).toBeNull();

    // Card still draggable after cancel
    act(() =>
      result.current.handlePointerDown(
        makePointerEvent({ clientX: 150, clientY: 140, currentTarget: card, pointerId: 2 }),
        "cargo-A"
      )
    );
    expect(result.current.activeItemId).toBe("cargo-A");
  });
});
