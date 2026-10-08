import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react";
import type { CargoItem } from "../../../core/types/viewModels/CargoItem";
import { CargoList } from "../CargoList";
import {
  CARGO_LIST_GROUP_BORDER,
  CARGO_LIST_PANEL_MAX_HEIGHT,
  CARGO_LIST_PANEL_SINGLE_ROW_HEIGHT,
} from "../../../core/constants/cargoList";

const makeItem = (overrides: Partial<CargoItem> = {}): CargoItem => ({
  id: "cargo-GUID-1",
  name: "Pallet A",
  type: "pallet",
  color: "#777788",
  isLocked: false,
  x: 10,
  y: 20,
  length: 120,
  width: 80,
  rotation: 0,
  quantity: 1,
  ...overrides,
});

const mockRect = (x: number, y = 100, width = 100, height = 80) => ({
  left: x,
  top: y,
  right: x + width,
  bottom: y + height,
  width,
  height,
  x,
  y,
  toJSON: () => ({}),
});

const renderList = (
  availableItems: CargoItem[],
  onAddCargo?: (item: CargoItem) => void,
  onPointerDragStart?: (e: React.PointerEvent, cargo: CargoItem, instanceIndex: number) => void,
  canvasRef?: { current: HTMLDivElement | null },
  shouldSuppressClick?: () => boolean
) => {
  const utils = render(
    <div
      ref={(node) => {
        if (canvasRef) {
          canvasRef.current = node;
        }
      }}>
      <CargoList
        availableItems={availableItems}
        onAddCargo={onAddCargo ?? jest.fn()}
        placedInstances={new Map()}
        numberStart={new Map()}
        canvasRef={canvasRef}
        onPointerDragStart={onPointerDragStart}
        shouldSuppressClick={shouldSuppressClick}
      />
    </div>
  );
  // CargoList's root element is the drop-zone panel; chip names live only in
  // title attributes, so locate the panel structurally. Cast to HTMLElement
  // (jsdom container children are always elements) for rect/style access.
  const list = utils.container.firstElementChild?.firstElementChild as HTMLElement | null | undefined;
  if (!list) {
    throw new Error("cargo list panel not found");
  }
  return { ...utils, list };
};

// Grouped render: the panel's children are transport-order groups (each with the
// dashed border); a group's children are that order's chips.
const groupsOf = (list: HTMLElement): HTMLElement[] => Array.from(list.children) as HTMLElement[];
const chipsOf = (list: HTMLElement): HTMLElement[] =>
  groupsOf(list).flatMap((group) => Array.from(group.children) as HTMLElement[]);

describe("CargoList pointer gestures", () => {
  it("calls onPointerDragStart on pointerdown (list->canvas drag start)", () => {
    const onPointerDragStart = jest.fn();
    const { list } = renderList([makeItem()], jest.fn(), onPointerDragStart);

    const chip = chipsOf(list)[0];
    expect(chip).toBeTruthy();

    fireEvent.pointerDown(chip, { clientX: 100, clientY: 100 });

    expect(onPointerDragStart).toHaveBeenCalledTimes(1);
    expect(onPointerDragStart).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ id: "cargo-GUID-1" }),
      0
    );
  });

  it("does not call onPointerDragStart on click (click is handled by onAddCargo)", () => {
    const onPointerDragStart = jest.fn();
    const onAddCargo = jest.fn();
    const { list } = renderList([makeItem()], onAddCargo, onPointerDragStart);

    const chip = chipsOf(list)[0];
    fireEvent.click(chip);

    expect(onPointerDragStart).not.toHaveBeenCalled();
    expect(onAddCargo).toHaveBeenCalledTimes(1);
  });

  it("suppresses the trailing chip click after a real drag (no double add)", () => {
    const onAddCargo = jest.fn();
    const { list } = renderList([makeItem()], onAddCargo, jest.fn(), undefined, () => true);

    const chip = chipsOf(list)[0];
    fireEvent.click(chip);

    expect(onAddCargo).not.toHaveBeenCalled();
  });

  it("exposes the empty-state div as the panelRef node (B-0011)", () => {
    // Fully-placed layout: no chips, empty state renders instead of the panel.
    // The external ref must still point at THIS node so canvas->list drops hit-test.
    const panelRef: { current: HTMLDivElement | null } = { current: null };
    const utils = render(
      <CargoList
        availableItems={[]}
        onAddCargo={jest.fn()}
        placedInstances={new Map()}
        numberStart={new Map()}
        panelRef={panelRef}
      />
    );
    const emptyState = utils.container.firstElementChild as HTMLElement;
    expect(panelRef.current).toBe(emptyState);
  });

  it("calls onAddCargo on click with correct instance id", () => {
    const onAddCargo = jest.fn();
    const { list } = renderList([makeItem({ id: "cargo-GUID-7", quantity: 3 })], onAddCargo);

    const chip = chipsOf(list)[0];
    fireEvent.click(chip);

    expect(onAddCargo).toHaveBeenCalledWith(expect.objectContaining({ id: "cargo-GUID-7-0" }));
  });

  it("does nothing when onAddCargo is not provided", () => {
    const onAddCargo = jest.fn();
    const { list } = renderList([makeItem()], undefined);

    const chip = chipsOf(list)[0];
    fireEvent.click(chip);

    // Should not throw even without onAddCargo
    expect(onAddCargo).not.toHaveBeenCalled();
  });

  it("renders empty state correctly when no items", () => {
    const { list } = renderList([]);

    expect(list.textContent).toContain("No cargo items available");
  });

  it("renders multiple chips with correct numbering", () => {
    const { list } = renderList([makeItem({ quantity: 3, id: "cargo-GUID-3" })]);

    // A single order's units share one group; the chips are that group's children.
    const chips = chipsOf(list);
    expect(chips).toHaveLength(3);
    expect(chips[0].textContent).toContain("1");
    expect(chips[1].textContent).toContain("2");
    expect(chips[2].textContent).toContain("3");
  });

  it("limits panel height to max and shows scroll", () => {
    const items = Array.from({ length: 20 }, (_, i) => makeItem({ id: `cargo-GUID-${i}`, quantity: 1 }));
    const { list } = renderList(items);

    expect(list.style.maxHeight).toBe(CARGO_LIST_PANEL_MAX_HEIGHT + "px");
    expect(list.style.overflowY).toBe("auto");
  });

  it("renders empty state with correct single-row height", () => {
    const { list } = renderList([]);

    expect(list.style.height).toBe(CARGO_LIST_PANEL_SINGLE_ROW_HEIGHT + "px");
    expect(list.style.display).toBe("flex");
  });
});

describe("CargoList chip tooltip", () => {
  it("shows tooltip on mouse over chip, hoisted out of the scroll container", () => {
    const canvasRef: { current: HTMLDivElement | null } = { current: null };
    const rendered = renderList([makeItem({ transportOrderNo: "TO-123" })], jest.fn(), undefined, canvasRef);
    const list = rendered.list;
    canvasRef.current!.getBoundingClientRect = () => mockRect(0, 0, 1000, 600);

    const chip = chipsOf(list)[0];
    chip.getBoundingClientRect = () => mockRect(100);

    fireEvent.mouseOver(chip);

    const anchor = list.nextElementSibling as HTMLElement | null;
    expect(anchor).toBeTruthy();
    expect(anchor!.textContent).toContain("Order: TO-123");
    expect(anchor!.textContent).toContain("Drag Pallet A onto canvas");
    // Regression (B-0013): the scroll container must not own the tooltip, or its
    // overflow hides the tooltip whenever the list is short.
    expect(list.textContent).not.toContain("Order: TO-123");
  });

  it("composes horizontal and vertical placement", () => {
    const canvasRef: { current: HTMLDivElement | null } = { current: null };
    const rendered = renderList([makeItem()], jest.fn(), undefined, canvasRef);
    const list = rendered.list;
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error("canvas element not mounted");
    }
    // Canvas starts far to the right and is tall: the tooltip anchors its left
    // edge (canvas border) and stays below (room inside the canvas).
    canvas.getBoundingClientRect = () => ({
      left: 600,
      top: 0,
      right: 1600,
      bottom: 600,
      width: 1000,
      height: 600,
      x: 600,
      y: 0,
      toJSON: () => ({}),
    });
    const chip = chipsOf(list)[0];
    chip.getBoundingClientRect = () => mockRect(100);

    fireEvent.mouseOver(chip);

    const tooltip = list.nextElementSibling?.firstElementChild as HTMLElement | null;
    const style = tooltip?.getAttribute("style") ?? "";
    expect(style).toContain("left");
    expect(style).toContain("top");
  });

  it("clears the tooltip on panel scroll so placement never goes stale", () => {
    const canvasRef: { current: HTMLDivElement | null } = { current: null };
    const rendered = renderList([makeItem({ transportOrderNo: "TO-9" })], jest.fn(), undefined, canvasRef);
    const list = rendered.list;
    canvasRef.current!.getBoundingClientRect = () => mockRect(0, 0, 1000, 600);

    const chip = chipsOf(list)[0];
    chip.getBoundingClientRect = () => mockRect(100);

    fireEvent.mouseOver(chip);
    expect(list.nextElementSibling?.textContent).toContain("Order: TO-9");

    fireEvent.scroll(list);
    expect(list.nextElementSibling).toBeNull();
  });
});

describe("CargoList chip tooltip alignment", () => {
  const styleOf = (el: HTMLElement | null): string => (el ? (el.getAttribute("style") ?? "") : "NULL");
  // The tooltip is hoisted out of the panel: it lives inside the anchor wrapper
  // rendered as the panel's next sibling.
  const findTooltip = (list: HTMLElement): HTMLElement | null =>
    (list.nextElementSibling?.firstElementChild as HTMLElement | null) ?? null;

  it("anchors the tooltip left for chips near the canvas left border", () => {
    const canvasRef = { current: null };
    const rendered = renderList([makeItem()], jest.fn(), undefined, canvasRef);
    const list = rendered.list;
    const chip = chipsOf(list)[0];
    fireEvent.mouseOver(chip);
    const style = styleOf(findTooltip(list));
    if (style.indexOf("left") < 0 || style.indexOf("right") >= 0) {
      throw new Error("LEFT-ALIGN-FAIL style=[" + style + "]");
    }
  });

  it("keeps the default right alignment when the chip has room to the left", () => {
    const canvasRef: { current: HTMLDivElement | null } = { current: null };
    const rendered = renderList([makeItem()], jest.fn(), undefined, canvasRef);
    const list = rendered.list;
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error("canvas element not mounted");
    }
    canvas.getBoundingClientRect = () => ({
      left: -1000,
      top: 0,
      right: 0,
      bottom: 600,
      width: 1000,
      height: 600,
      x: -1000,
      y: 0,
      toJSON: () => ({}),
    });
    const chip = chipsOf(list)[0];
    fireEvent.mouseOver(chip);
    const style = styleOf(findTooltip(list));
    if (style.indexOf("right") < 0 || style.indexOf("left") >= 0) {
      throw new Error("RIGHT-ALIGN-FAIL style=[" + style + "]");
    }
  });

  it("flips a short-list tooltip above the chip when the canvas bottom is near", () => {
    const canvasRef: { current: HTMLDivElement | null } = { current: null };
    const rendered = renderList([makeItem()], jest.fn(), undefined, canvasRef);
    const list = rendered.list;
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error("canvas element not mounted");
    }
    canvas.getBoundingClientRect = () => mockRect(0, 0, 1000, 600);
    const chip = chipsOf(list)[0];
    // Chip near the canvas bottom: no room below, room above (B-0013 scenario).
    chip.getBoundingClientRect = () => mockRect(100, 560, 100, 30);

    fireEvent.mouseOver(chip);

    // Hoisted out of the scroll container (the original clipping bug)...
    const anchor = list.nextElementSibling as HTMLElement | null;
    expect(anchor).toBeTruthy();
    expect(list.textContent).not.toContain("Drag Pallet A onto canvas");
    // ...and flipped above the chip.
    const style = styleOf(findTooltip(list));
    expect(style).toContain("bottom");
  });
});

describe("CargoList transport-order grouping", () => {
  // Split the SSOT border ("1px dashed #999") so the assertions pin the value
  // without depending on jsdom's hex→rgb color normalization.
  const [groupBorderWidth, groupBorderStyle] = CARGO_LIST_GROUP_BORDER.split(" ");

  it("wraps each transport order's units in one dashed group", () => {
    const { list } = renderList([makeItem({ id: "cargo-A", quantity: 1 }), makeItem({ id: "cargo-B", quantity: 1 })]);

    const groups = groupsOf(list);
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      expect(group.style.borderStyle).toBe(groupBorderStyle);
      expect(group.style.borderWidth).toBe(groupBorderWidth);
    }
  });

  it("keeps a multi-unit order's chips inside a single group", () => {
    const { list } = renderList([makeItem({ id: "cargo-A", quantity: 3 })]);

    expect(groupsOf(list)).toHaveLength(1);
    expect(chipsOf(list)).toHaveLength(3);
  });

  it("separates chips of different transport orders into their own groups", () => {
    const { list } = renderList([makeItem({ id: "cargo-A", quantity: 2 }), makeItem({ id: "cargo-B", quantity: 1 })]);

    const groups = groupsOf(list);
    expect(groups).toHaveLength(2);
    expect(Array.from(groups[0].children)).toHaveLength(2);
    expect(Array.from(groups[1].children)).toHaveLength(1);
  });
});
