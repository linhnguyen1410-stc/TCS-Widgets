import { describe, it, expect } from "@jest/globals";
import { autoLoadCargoUnits, expandCargoByQuantity, packCargoIntoBounds } from "../packingRules";
import { fromCargoId } from "../../../core/utils/cargoId";
import type { CargoItem } from "../../../core/types/viewModels/CargoItem";
import type { RectLike } from "../../../core/types/geometry";

const makeCargo = (id: string, length: number, width: number): CargoItem => ({
  id,
  name: id,
  x: 0,
  y: 0,
  length,
  width,
  rotation: 0,
  type: "pallet",
  color: "orange",
  isLocked: false,
});

const TRUCK: RectLike = { x: 0, y: 0, length: 200, width: 100 };

const rectsOverlap = (a: RectLike, b: RectLike): boolean => {
  return !(a.x + a.length <= b.x || b.x + b.length <= a.x || a.y + a.width <= b.y || b.y + b.width <= a.y);
};

const isInside = (rect: RectLike, bounds: RectLike): boolean => {
  return (
    rect.x >= bounds.x &&
    rect.y >= bounds.y &&
    rect.x + rect.length <= bounds.x + bounds.length &&
    rect.y + rect.width <= bounds.y + bounds.width
  );
};

describe("packCargoIntoBounds", () => {
  it("returns empty result for empty input", () => {
    const result = packCargoIntoBounds([], TRUCK);
    expect(result.placed).toEqual([]);
    expect(result.unplaced).toEqual([]);
  });

  it("places all fitting items without overlap inside bounds", () => {
    const items = [makeCargo("A", 120, 60), makeCargo("B", 80, 40), makeCargo("C", 40, 40)];

    const { placed, unplaced } = packCargoIntoBounds(items, TRUCK);

    expect(unplaced).toEqual([]);
    expect(placed.map((item) => item.id)).toEqual(["A", "B", "C"]);

    const rects: RectLike[] = placed.map(({ x, y, length, width }) => ({ x, y, length, width }));
    for (let i = 0; i < rects.length; i++) {
      expect(isInside(rects[i], TRUCK)).toBe(true);
      for (let j = i + 1; j < rects.length; j++) {
        expect(rectsOverlap(rects[i], rects[j])).toBe(false);
      }
    }
  });

  it("places the largest item at the bounds origin regardless of input order", () => {
    const items = [makeCargo("C", 40, 40), makeCargo("B", 80, 40), makeCargo("A", 120, 60)];

    const { placed } = packCargoIntoBounds(items, TRUCK);
    const largest = placed.find((item) => item.id === "A");

    expect(largest).toBeDefined();
    expect(largest!.x).toBe(0);
    expect(largest!.y).toBe(0);
  });

  it("keeps items that cannot fit anywhere in unplaced", () => {
    const items = [makeCargo("huge", 300, 500), makeCargo("small", 40, 40)];

    const { placed, unplaced } = packCargoIntoBounds(items, TRUCK);

    expect(placed.map((item) => item.id)).toEqual(["small"]);
    expect(unplaced.map((item) => item.id)).toEqual(["huge"]);
  });

  it("uses 90° rotation to fit an item that does not fit in its original orientation", () => {
    const narrowTruck: RectLike = { x: 0, y: 0, length: 130, width: 200 };
    const wideItem = makeCargo("wide", 140, 50);

    const withoutRotation = packCargoIntoBounds([wideItem], narrowTruck, undefined, {
      allowRotation: false,
    });
    expect(withoutRotation.unplaced.map((item) => item.id)).toEqual(["wide"]);

    const withRotation = packCargoIntoBounds([wideItem], narrowTruck);
    expect(withRotation.placed).toHaveLength(1);
    expect(withRotation.placed[0].rotation).toBe(90);
    expect(
      isInside({ x: withRotation.placed[0].x, y: withRotation.placed[0].y, length: 50, width: 140 }, narrowTruck)
    ).toBe(true);
  });

  it("keeps later placements correct after a rotated item is packed", () => {
    // Regression: occupied rects used to store `rotation`, so geometryRules
    // applied the swap a second time and corrupted every later overlap check.
    const tallBounds: RectLike = { x: 0, y: 0, length: 200, width: 300 };
    const longItem = makeCargo("long", 250, 50); // only fits rotated (50×250)
    const smallItem = makeCargo("small", 60, 60);

    const { placed, unplaced } = packCargoIntoBounds([longItem, smallItem], tallBounds);

    expect(unplaced).toEqual([]);
    expect(placed.find((item) => item.id === "long")!.rotation).toBe(90);

    const longRect: RectLike = { x: placed[0].x, y: placed[0].y, length: 50, width: 250 };
    const smallRect: RectLike = { x: placed[1].x, y: placed[1].y, length: 60, width: 60 };
    expect(isInside(longRect, tallBounds)).toBe(true);
    expect(isInside(smallRect, tallBounds)).toBe(true);
    expect(rectsOverlap(longRect, smallRect)).toBe(false);
  });

  it("hugs a non-grid-aligned truck border and packs realistic pallets", () => {
    // Real runtime values: truck frame at (333, 152), scale ≈ 106.84 px/m
    // for a 13.6 m truck, seven 1.2 × 0.8 m pallets.
    const truckFrame: RectLike = { x: 333, y: 152, length: 1453, width: 297 };
    const scale = { widthScale: 106.84, heightScale: 106.84 };
    const items = Array.from({ length: 7 }, (_, i) => makeCargo(`pallet-${i}`, 1.2 * 106.84, 0.8 * 106.84));

    const { placed, unplaced } = packCargoIntoBounds(items, truckFrame, scale);

    expect(unplaced).toEqual([]);

    const first = placed.find((item) => item.id === "pallet-0")!;
    expect(first.x).toBe(333);
    expect(first.y).toBe(152);

    const rects: RectLike[] = placed.map(({ x, y, length, width, rotation }) => ({
      x,
      y,
      length: rotation === 90 ? width : length,
      width: rotation === 90 ? length : width,
    }));
    for (let i = 0; i < rects.length; i++) {
      expect(isInside(rects[i], truckFrame)).toBe(true);
      for (let j = i + 1; j < rects.length; j++) {
        expect(rectsOverlap(rects[i], rects[j])).toBe(false);
      }
    }

    // Load meters shrink below the naive single shelf of seven upright pallets
    // because the packer mixes 90° turns to stack units towards the front.
    const usedLength = Math.max(...rects.map((rect) => rect.x + rect.length)) - truckFrame.x;
    expect(usedLength).toBeLessThan(7 * 1.2 * 106.84);
  });

  it("places items flush edge-to-edge horizontally and vertically", () => {
    const wideBounds: RectLike = { x: 0, y: 0, length: 300, width: 100 };
    const { placed: row } = packCargoIntoBounds([makeCargo("h1", 120, 60), makeCargo("h2", 120, 60)], wideBounds);

    expect(row).toHaveLength(2);
    expect(row[1].y).toBe(row[0].y);
    expect(row[1].x - row[0].x).toBeCloseTo(row[0].length, 6);

    // Narrow bounds force a second and third shelf. Partial stacks load
    // walls-inward (BR-25): the second shelf anchors to the bottom wall, so the
    // slack gap sits mid-column instead of at the bottom; adjacent shelves stay
    // flush where they touch.
    const tallBounds: RectLike = { x: 0, y: 0, length: 150, width: 260 };
    const { placed: stack } = packCargoIntoBounds(
      [makeCargo("v1", 100, 80), makeCargo("v2", 100, 80), makeCargo("v3", 100, 80)],
      tallBounds
    );

    expect(stack.map((item) => item.y)).toEqual([0, 180, 80]);
    expect(stack.every((item) => item.x === 0)).toBe(true);
  });

  it("preserves cargo identity fields while recomputing position", () => {
    const cargo = makeCargo("A", 120, 60);
    cargo.name = "Pallet EU";
    cargo.weightKg = 350;

    const { placed } = packCargoIntoBounds([cargo], TRUCK);
    const packed = placed[0];

    expect(packed.id).toBe("A");
    expect(packed.name).toBe("Pallet EU");
    expect(packed.weightKg).toBe(350);
    expect(packed.length).toBe(120);
    expect(packed.width).toBe(60);
  });

  it("finds the length-optimal layout for small loads via the exact solver", () => {
    // First-fit shelf loads B and C to the right of A (used length 200 px);
    // the optimum stacks B and C underneath A (used length 120 px).
    const items = [makeCargo("A", 120, 60), makeCargo("B", 80, 40), makeCargo("C", 40, 40)];

    const { placed, unplaced } = packCargoIntoBounds(items, TRUCK);

    expect(unplaced).toEqual([]);
    const usedLength = Math.max(...placed.map((item) => item.x + (item.rotation === 90 ? item.width : item.length)));
    expect(usedLength).toBe(120);
  });

  it("routes large loads through the skyline and still fills tight shelves", () => {
    const bounds: RectLike = { x: 0, y: 0, length: 300, width: 90 };
    const items = Array.from({ length: 18 }, (_, i) => makeCargo(`pallet-${i}`, 50, 30));

    const { placed, unplaced } = packCargoIntoBounds(items, bounds);

    expect(unplaced).toEqual([]);
    expect(placed).toHaveLength(18);
    expect([...new Set(placed.map((item) => item.y))].sort((a, b) => a - b)).toEqual([0, 30, 60]);

    const rects: RectLike[] = placed.map(({ x, y, length, width }) => ({ x, y, length, width }));
    for (let i = 0; i < rects.length; i++) {
      expect(isInside(rects[i], bounds)).toBe(true);
      for (let j = i + 1; j < rects.length; j++) {
        expect(rectsOverlap(rects[i], rects[j])).toBe(false);
      }
    }
  });

  it("spreads partial stacks to both side walls (even wall loading, BR-25)", () => {
    const bounds: RectLike = { x: 0, y: 0, length: 200, width: 240 };
    // Rotation off: without it the solver would turn both units 90° to shorten
    // the span, which is not what this test isolates.
    const { placed, unplaced } = packCargoIntoBounds(
      [makeCargo("a", 100, 80), makeCargo("b", 100, 80)],
      bounds,
      undefined,
      { allowRotation: false }
    );

    expect(unplaced).toEqual([]);
    // Both units keep the front X span but hug opposite walls: 0..80 and 160..240.
    expect(new Set(placed.map((item) => item.y))).toEqual(new Set([0, 160]));
  });

  it("spreads skyline partial columns to both walls (large loads, BR-25)", () => {
    const bounds: RectLike = { x: 0, y: 0, length: 400, width: 90 };
    const items = Array.from({ length: 20 }, (_, i) => makeCargo(`pallet-${i}`, 50, 30));

    const { placed, unplaced } = packCargoIntoBounds(items, bounds);

    expect(unplaced).toEqual([]);
    expect(placed).toHaveLength(20);
    // The 7th column is partial (2 of 3 lanes); its lanes must hug both walls
    // (y 0 and y 60) instead of stacking contiguously at the top (y 0 and y 30).
    const lastColumn = placed.filter((item) => Math.round(item.x) === 300);
    expect(lastColumn.map((item) => item.y).sort((a, b) => a - b)).toEqual([0, 60]);
  });

  it("keeps skyline output valid for mixed large loads", () => {
    const bounds: RectLike = { x: 333, y: 152, length: 1453, width: 297 };
    const scale = { widthScale: 106.84, heightScale: 106.84 };
    const sizes = [
      [1.2 * 106.84, 0.8 * 106.84],
      [0.9 * 106.84, 0.6 * 106.84],
      [1.5 * 106.84, 0.9 * 106.84],
    ];
    const items = Array.from({ length: 30 }, (_, i) => makeCargo(`unit-${i}`, sizes[i % 3][0], sizes[i % 3][1]));

    const { placed } = packCargoIntoBounds(items, bounds, scale);

    expect(placed.length).toBeGreaterThan(0);
    const rects: RectLike[] = placed.map(({ x, y, length, width, rotation }) => ({
      x,
      y,
      length: rotation === 90 ? width : length,
      width: rotation === 90 ? length : width,
    }));
    for (let i = 0; i < rects.length; i++) {
      expect(isInside(rects[i], bounds)).toBe(true);
      for (let j = i + 1; j < rects.length; j++) {
        expect(rectsOverlap(rects[i], rects[j])).toBe(false);
      }
    }
  });
});

describe("expandCargoByQuantity / autoLoadCargoUnits (Auto Load idempotence)", () => {
  const order = (id: string, quantity: number): CargoItem => ({ ...makeCargo(id, 120, 60), quantity });

  it("expands a raw list entry into one instance per quantity unit", () => {
    const expanded = expandCargoByQuantity([order("cargo-G", 3)]);

    expect(expanded.map((i) => i.id)).toEqual(["cargo-G-0", "cargo-G-1", "cargo-G-2"]);
  });

  it("passes canvas instances through unchanged when the list is empty", () => {
    const onCanvas = [
      makeCargo("cargo-G-0", 120, 60),
      makeCargo("cargo-G-1", 120, 60),
      makeCargo("cargo-G-2", 120, 60),
    ];

    expect(autoLoadCargoUnits(onCanvas, []).map((i) => i.id)).toEqual(["cargo-G-0", "cargo-G-1", "cargo-G-2"]);
  });

  it("keeps the same unit set on repeated Auto Load runs (no duplication)", () => {
    const firstRun = autoLoadCargoUnits([], [order("cargo-G", 2), order("cargo-H", 1)]);
    const idsAfterFirst = firstRun.map((i) => i.id);

    // Second run: the canvas carries firstRun instances, the list is re-derived empty.
    const secondRun = autoLoadCargoUnits(firstRun, []);

    expect(secondRun.map((i) => i.id)).toEqual(idsAfterFirst);
  });

  it("produces ids that still resolve to the base order GUID (list stays empty)", () => {
    const expandedIds = autoLoadCargoUnits([], [order("cargo-G", 3)]).map((i) => fromCargoId(i.id));

    expect(new Set(expandedIds)).toEqual(new Set(["G"]));
  });

  it("only expands instance indices that are not already placed (no id collisions)", () => {
    const onCanvas = [makeCargo("cargo-G-0", 120, 60), makeCargo("cargo-G-3", 120, 60)];
    const placedInstances = new Map<string, Set<number>>([["G", new Set([0, 3])]]);

    const expanded = autoLoadCargoUnits(onCanvas, [order("cargo-G", 4)], placedInstances);

    expect(expanded.map((i) => i.id)).toEqual(["cargo-G-0", "cargo-G-3", "cargo-G-1", "cargo-G-2"]);
  });
});

describe("packingRules planned loading order (BR-24)", () => {
  const bounds: RectLike = { x: 0, y: 0, length: 600, width: 200 };
  const scale = { widthScale: 1, heightScale: 1 };

  const unit = (id: string, sequence: number | undefined): CargoItem => ({
    id,
    name: id,
    type: "pallet",
    color: "orange",
    isLocked: false,
    x: 0,
    y: 0,
    length: 100,
    width: 100,
    rotation: 0,
    quantity: 1,
    sequence,
  });

  it("assigns the cabin-most slots to transport order 1", () => {
    // Three identical units: order 1 must take the front-most slot even though order 2
    // is offered first (the geometry solver packs them, the sequence assigns the slots).
    const items = [unit("cargo-order-2", 2), unit("cargo-order-2b", 2), unit("cargo-order-1", 1)];

    const { placed } = packCargoIntoBounds(items, bounds, scale);

    expect(placed).toHaveLength(3);
    const first = placed.find((item) => item.id === "cargo-order-1")!;
    const second = placed.filter((item) => item.sequence === 2);
    expect(first.x).toBeLessThanOrEqual(Math.min(...second.map((item) => item.x)));
    expect(Math.min(...placed.map((item) => item.x))).toBe(bounds.x);
  });

  it("leaves the assignment untouched when no sequence data is present", () => {
    const items = [unit("a", undefined), unit("b", undefined), unit("c", undefined)];

    const once = packCargoIntoBounds(items, bounds, scale);
    const twice = packCargoIntoBounds(items, bounds, scale);

    // Same geometry as the pre-sequence packer and independent of the offer order.
    expect(once.placed.map((item) => `${item.id}@${item.x},${item.y}`)).toEqual(
      twice.placed.map((item) => `${item.id}@${item.x},${item.y}`)
    );
    // Pre-sequence geometry: two units share the cabin column (front bias prefers more
    // units at dx = 0), the third sits behind them. Unchanged by the sequence pass.
    expect(once.placed.map((item) => item.x).sort((l, r) => l - r)).toEqual([0, 0, 100]);
  });
});
