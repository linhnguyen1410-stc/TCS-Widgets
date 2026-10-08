import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react";
import type { CargoItem } from "../../../core/types/viewModels/CargoItem";
import { DEFAULT_CANVAS_WIDTH } from "../../../core/constants/canvas";
import { CargoCard, computePopupSide } from "../CargoCard";

const makeItem = (overrides: Partial<CargoItem> = {}): CargoItem => ({
  id: "cargo-1",
  name: "Pallet A",
  type: "pallet",
  color: "#777788",
  isLocked: false,
  x: 10,
  y: 20,
  length: 120,
  width: 80,
  rotation: 0,
  transportOrderNo: "TO-001",
  productName: "Widget",
  producerName: "ProducerCo",
  companyFromName: "FromCo",
  companyToName: "ToCo",
  ...overrides,
});

const renderCard = (
  isPopupOpen: boolean,
  canvasWidth = DEFAULT_CANVAS_WIDTH,
  item: CargoItem = makeItem(),
  isActive = false
) => {
  const onTogglePopup = jest.fn();
  const utils = render(
    <CargoCard
      item={item}
      isActive={isActive}
      selectedIds={[]}
      number={1}
      onPointerDown={() => undefined}
      onRotate={(_itemId: string) => undefined}
      isPopupOpen={isPopupOpen}
      onTogglePopup={onTogglePopup}
      hasError={false}
      canvasWidth={canvasWidth}
    />
  );
  const card = utils.container.querySelector(`[data-id="${item.id}"]`);
  if (!card) {
    throw new Error("cargo card element not found");
  }
  return { ...utils, onTogglePopup, card };
};

describe("CargoCard popup interaction", () => {
  it("does not toggle the popup on a single click", () => {
    const { card, onTogglePopup } = renderCard(false);
    fireEvent.click(card);
    expect(onTogglePopup).not.toHaveBeenCalled();
  });

  it("toggles the popup on double click", () => {
    const { card, onTogglePopup } = renderCard(false);
    fireEvent.dblClick(card);
    expect(onTogglePopup).toHaveBeenCalledTimes(1);
  });

  it("shows the popup when isPopupOpen is true", () => {
    const { getAllByText } = renderCard(true);
    // Label/value are split across <span> + text node, so match the row by its full textContent.
    expect(getAllByText((_content, element) => element?.textContent === "From:FromCo").length).toBeGreaterThan(0);
  });

  it("hides the popup when isPopupOpen is false", () => {
    const { queryAllByText } = renderCard(false);
    expect(queryAllByText((_content, element) => element?.textContent === "From:FromCo").length).toBe(0);
  });
});

describe("CargoCard pointer gesture", () => {
  it("no longer uses native drag — unified pointer gesture handles all interactions", () => {
    const { card } = renderCard(false, DEFAULT_CANVAS_WIDTH, makeItem({ id: "cargo-G-3" }));
    // Card no longer has draggable attribute or onDragStart handler
    expect(card.getAttribute("draggable")).toBeNull();
    // The native drag path is removed; pointer events are used instead
  });
});

describe("CargoCard stacking", () => {
  it("lifts the active (dragged) card above settled cargo (B-0014)", () => {
    const { container } = renderCard(false, DEFAULT_CANVAS_WIDTH, makeItem(), true);
    const root = container.firstElementChild as HTMLElement;
    // All cards are z-index auto, so DOM order alone would let later cards paint
    // over the card being dragged.
    expect(root.style.zIndex).toBe("20");
  });

  it("leaves idle cards at the default stacking level", () => {
    const { container } = renderCard(false);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.zIndex).toBe("");
  });
});

describe("computePopupSide", () => {
  it("shows the popup on the right when there is plenty of room", () => {
    expect(computePopupSide(10, 120, DEFAULT_CANVAS_WIDTH)).toBe("right");
  });

  it("flips the popup to the left when it would overflow the right edge", () => {
    expect(computePopupSide(1500, 120, DEFAULT_CANVAS_WIDTH)).toBe("left");
  });

  it("keeps the popup on the right at the exact fit boundary", () => {
    // spaceRight = 1800 - (1472 + 0) = 328 = POPUP_MAX_WIDTH + POPUP_MARGIN_OFFSET
    expect(computePopupSide(1472, 0, DEFAULT_CANVAS_WIDTH)).toBe("right");
  });

  it("flips to the left just below the fit boundary", () => {
    // spaceRight = 1800 - (1473 + 0) = 327, one pixel short of the 328 threshold
    expect(computePopupSide(1473, 0, DEFAULT_CANVAS_WIDTH)).toBe("left");
  });
});
