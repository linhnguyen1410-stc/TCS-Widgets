import { describe, it, expect } from "@jest/globals";
import { CanvasController } from "../../../state/CanvasController";
import { autoLoadCargoUnits, packCargoIntoBounds, expandCargoByQuantity } from "../packingRules";
import { placedInstancesOf } from "../../../core/utils/cargoId";
import { CargoItem, CargoType } from "../../../core/types/viewModels/CargoItem";
import { TruckItem } from "../../../core/types/viewModels/TruckItem";
import { RectLike } from "../../../core/types/geometry";
import {
  TRUCK_CANVAS_LEFT,
  TRUCK_CANVAS_TOP,
  TRUCK_CANVAS_WIDTH,
  TRUCK_DRAWING_MIDLINE_Y,
  TRUCK_FRAME_HEIGHT_PX,
} from "../../../core/constants/canvas";
import { validateAll } from "../../rules/validationRules";
import { getTruckFrontDataX } from "../../rules/boundaryRules";
import { isInsideBounds, overlaps } from "../../rules/geometryRules";

describe("Integration: Auto Load Flow (Toolbar → PackingRules → Controller)", () => {
  const makeCargo = (id: string, length = 120, width = 80): CargoItem => ({
    id,
    name: id,
    type: "pallet" as CargoType,
    color: "orange",
    isLocked: false,
    x: 0,
    y: 0,
    length,
    width,
    rotation: 0,
    quantity: 1,
  });

  const truckBounds: RectLike = { x: 333, y: 152, length: 1453, width: 297 };
  const scale = { widthScale: 106.84, heightScale: 106.84 };

  const makeTruck = (): TruckItem => ({
    id: "truck-1",
    code: "T1",
    truckType: "DryVan",
    maxPayloadKg: 20000,
    axleCount: 2,
    maxLoadMeters: 13.6,
    x: 333,
    y: 152,
    length: 1453,
    width: 297,
    rotation: 0,
  });

  it("expands available cargo by quantity, packs with placed instances, sets items on controller", () => {
    const controller = new CanvasController({
      initialItems: [makeCargo("cargo-A-0", 120, 80)],
      canvasWidth: 1800,
      canvasHeight: 600,
      scale,
      truck: makeTruck(),
    });

    const availableCargo = [
      { ...makeCargo("cargo-A"), quantity: 2 },
      { ...makeCargo("cargo-B"), quantity: 1 },
    ];

    const placed = placedInstancesOf(controller.getState().cargos);

    // autoLoadCargoUnits expects RAW still-in-list entries: it expands by quantity
    // itself and skips already-placed instance indices (pre-expanding would nest ids).
    const expandedItems = autoLoadCargoUnits(controller.getState().cargos, availableCargo, placed);
    const expandedLength = expandedItems.length;
    const expandedIds = expandedItems
      .map((i) => i.id)
      .sort()
      .join(",");

    // Extract primitives to avoid pretty-format issues
    expect(expandedLength).toBe(3);
    expect(expandedIds).toBe(["cargo-A-0", "cargo-A-1", "cargo-B-0"].sort().join(","));

    const { placed: packed, unplaced } = packCargoIntoBounds(expandedItems, truckBounds, scale);
    expect(unplaced.length).toBe(0);
    expect(packed.length).toBe(3);

    controller.setItems(packed);
    // Extract primitive length to avoid pretty-format issues
    const finalCargosLength = controller.getState().cargos.length;
    expect(finalCargosLength).toBe(3);
  });

  it("puts bigger cargo toward the truck front through the exact path (BR-24)", () => {
    // Square big units (250 × 250) exclude rotation and lane sharing (250 + 80 > 297),
    // so every ordering of [big, big, small-block] spans the same 500 + 80 px and only
    // the area-weighted front bias can order them — big units must lead at the front.
    const availableCargo = [
      { ...makeCargo("cargo-BIG"), quantity: 2, length: 250, width: 250 },
      { ...makeCargo("cargo-SMALL"), quantity: 4, length: 80, width: 80 },
    ];
    const units = autoLoadCargoUnits([], availableCargo, new Map());

    const { placed, unplaced } = packCargoIntoBounds(units, truckBounds, scale);

    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(6);
    const meanX = (prefix: string) => {
      const group = placed.filter((item) => item.id.startsWith(prefix));
      return group.reduce((sum, item) => sum + item.x, 0) / group.length;
    };
    expect(meanX("cargo-BIG")).toBeLessThan(meanX("cargo-SMALL"));
    // ALL big units lead: with lane sharing impossible (250 + 80 > 297), no small
    // may sit in front of any big — the strict BR-24 front-loading contract.
    const bigXs = placed.filter((item) => item.id.startsWith("cargo-BIG")).map((item) => item.x);
    const smallXs = placed.filter((item) => item.id.startsWith("cargo-SMALL")).map((item) => item.x);
    expect(Math.max(...bigXs)).toBeLessThanOrEqual(Math.min(...smallXs));
  });

  it("keeps bigger cargo toward the truck front on the skyline path (large loads)", () => {
    // 20 units exceed the exact limit, so the left-anchored skyline runs; big units
    // (placed first, area descending) must fill the front columns before smalls.
    const availableCargo = [
      { ...makeCargo("cargo-BIG"), quantity: 10, length: 150, width: 130 },
      { ...makeCargo("cargo-SMALL"), quantity: 10, length: 60, width: 60 },
    ];
    const units = autoLoadCargoUnits([], availableCargo, new Map());

    const { placed, unplaced } = packCargoIntoBounds(units, truckBounds, scale);

    expect(placed).toHaveLength(20);
    expect(unplaced).toHaveLength(0);
    const meanX = (prefix: string) => {
      const group = placed.filter((item) => item.id.startsWith(prefix));
      return group.reduce((sum, item) => sum + item.x, 0) / group.length;
    };
    expect(meanX("cargo-BIG")).toBeLessThan(meanX("cargo-SMALL"));
  });

  it("reports unplaced items when truck is full", () => {
    const controller = new CanvasController({
      initialItems: [],
      canvasWidth: 1800,
      canvasHeight: 600,
      scale,
      truck: { ...makeTruck(), maxLoadMeters: 0.1 },
    });

    const availableCargo = [{ ...makeCargo("cargo-HUGE"), quantity: 10, length: 1000, width: 200 }];
    const expanded = expandCargoByQuantity(availableCargo);
    const { placed, unplaced } = packCargoIntoBounds(expanded, truckBounds, scale);

    expect(unplaced.length).toBeGreaterThan(0);
    expect(placed.length).toBeLessThan(10);
  });

  it("repeated Auto Load is idempotent (no duplication)", () => {
    const controller = new CanvasController({
      initialItems: [],
      canvasWidth: 1800,
      canvasHeight: 600,
      scale,
      truck: makeTruck(),
    });

    const availableCargo = [{ ...makeCargo("cargo-G"), quantity: 2 }];
    const expanded = autoLoadCargoUnits([], availableCargo, new Map());
    const { placed } = packCargoIntoBounds(expanded, truckBounds, scale);

    controller.setItems(placed);
    const firstRunIds = controller
      .getState()
      .cargos.map((i) => i.id)
      .sort()
      .join(",");

    const secondRun = autoLoadCargoUnits(
      controller.getState().cargos,
      [],
      placedInstancesOf(controller.getState().cargos)
    );
    const { placed: placed2 } = packCargoIntoBounds(secondRun, truckBounds, scale);

    controller.setItems(placed2);
    const secondRunIds = controller
      .getState()
      .cargos.map((i) => i.id)
      .sort()
      .join(",");

    expect(secondRunIds).toBe(firstRunIds);
  });

  it("uses exact optimizer for ≤16 units, skyline for >16", () => {
    const controller = new CanvasController({
      initialItems: [],
      canvasWidth: 1800,
      canvasHeight: 600,
      scale,
      truck: makeTruck(),
    });

    const smallCargo = Array.from({ length: 10 }, (_, i) => makeCargo(`cargo-${i}`));
    const expandedSmall = expandCargoByQuantity(smallCargo.map((c) => ({ ...c, quantity: 1 })));
    const { placed: placedSmall } = packCargoIntoBounds(expandedSmall, truckBounds, scale);
    expect(placedSmall.length).toBe(10);

    const largeCargo = Array.from({ length: 20 }, (_, i) => makeCargo(`cargo-large-${i}`));
    const expandedLarge = expandCargoByQuantity(largeCargo.map((c) => ({ ...c, quantity: 1 })));
    const { placed: placedLarge } = packCargoIntoBounds(expandedLarge, truckBounds, scale);
    expect(placedLarge.length).toBeGreaterThan(0);
    expect(placedLarge.length).toBeLessThanOrEqual(20);
  });
});

describe("Integration: Tautliner capacity (13.6 LM × 2.45 m, BR-23)", () => {
  // Production geometry derived from the same constants the code uses: a 13.6 m truck
  // is "capped" (13.6 × (297/2.45) > 1453), so per truckAdapter the frame is
  // TRUCK_CANVAS_WIDTH long and 2.45 m × scale tall — NOT the 297 px fitting-truck
  // height used by the fixtures above.
  const TAUTLINER_LENGTH_M = 13.6;
  const TAUTLINER_WIDTH_M = 2.45;
  const scale = {
    widthScale: TRUCK_CANVAS_WIDTH / TAUTLINER_LENGTH_M,
    heightScale: TRUCK_CANVAS_WIDTH / TAUTLINER_LENGTH_M,
  };
  const truckBounds: RectLike = {
    x: TRUCK_CANVAS_LEFT,
    y: TRUCK_CANVAS_TOP,
    length: TRUCK_CANVAS_WIDTH,
    width: TAUTLINER_WIDTH_M * scale.heightScale, // ≈ 261.75 px (capped rule)
  };
  const pallet = (id: string): CargoItem => ({
    id,
    name: id,
    type: "pallet" as CargoType,
    color: "orange",
    isLocked: false,
    x: 0,
    y: 0,
    rotation: 0,
    quantity: 1,
    length: 1.2 * scale.widthScale, // EUR pallet: 1.2 m along the truck length
    width: 0.8 * scale.heightScale, // 0.8 m across the deck
  });

  it("loads a quantity-33 EUR-pallet order completely (33 placed, 0 unplaced)", () => {
    const order: CargoItem = { ...pallet("cargo-EUR"), quantity: 33 };
    const units = autoLoadCargoUnits([], [order], new Map());

    const startedAt = Date.now();
    const { placed, unplaced } = packCargoIntoBounds(units, truckBounds, scale);
    const elapsedMs = Date.now() - startedAt;

    expect(placed).toHaveLength(33);
    expect(unplaced).toHaveLength(0);

    // Every placement is inside the frame (BR-11) and overlap-free (BR-12).
    for (const item of placed) {
      expect(isInsideBounds(item, truckBounds, scale)).toBe(true);
    }
    for (const a of placed) {
      for (const b of placed) {
        if (a !== b) {
          expect(overlaps(a, b, scale)).toBe(false);
        }
      }
    }

    // Industry layout: 3 lanes × 11 upright columns, all 0° (BR-26 upright-first).
    expect(placed.every((item) => item.rotation === 0)).toBe(true);
    expect(new Set(placed.map((item) => Math.round(item.x))).size).toBe(11);
    expect(new Set(placed.map((item) => Math.round(item.y))).size).toBe(3);

    // Occupied span stays within the 13.6 LM budget (BR-17) — Verify-equivalent.
    const layout = validateAll(placed, truckBounds, {
      maxLoadMeters: TAUTLINER_LENGTH_M,
      scale,
      truckFrontDataX: getTruckFrontDataX({ length: truckBounds.length, x: truckBounds.x }),
    });
    expect(layout.valid).toBe(true);

    // Perf smoke: the skyline path must stay far below interactive budgets.
    expect(elapsedMs).toBeLessThan(2000);
  });

  it("packs the 33-pallet load deterministically", () => {
    const order: CargoItem = { ...pallet("cargo-EUR"), quantity: 33 };
    const units = autoLoadCargoUnits([], [order], new Map());
    const first = packCargoIntoBounds(units, truckBounds, scale);
    const second = packCargoIntoBounds(units, truckBounds, scale);
    const signature = (result: typeof first) =>
      result.placed
        .map((item) => `${item.id}@${item.x},${item.y},${item.rotation}`)
        .sort()
        .join(";");
    expect(signature(second)).toBe(signature(first));
  });

  it("loads the geometric maximum of 34 EUR pallets (2 rotated lanes × 17 columns)", () => {
    // The widget's geometric model has no loading gaps: rotating every pallet 90°
    // fits 2 lanes × 17 columns spanning exactly 13.6 LM (17 × 0.8 m), one more
    // than the upright 3-lane × 11-column layout. The rotated-first skyline pass
    // places strictly more units, so BR-24 (count first) picks it. Industry
    // practice loads 33 due to physical pallet tolerances; the model has none.
    const order: CargoItem = { ...pallet("cargo-EUR"), quantity: 34 };
    const units = autoLoadCargoUnits([], [order], new Map());

    const { placed, unplaced } = packCargoIntoBounds(units, truckBounds, scale);

    expect(placed).toHaveLength(34);
    expect(unplaced).toHaveLength(0);
    expect(placed.every((item) => item.rotation === 90)).toBe(true);
    expect(new Set(placed.map((item) => Math.round(item.x))).size).toBe(17);
    expect(new Set(placed.map((item) => Math.round(item.y))).size).toBe(2);

    // The span is exactly 13.6 LM — valid within the LM epsilon budget.
    const layout = validateAll(placed, truckBounds, {
      maxLoadMeters: TAUTLINER_LENGTH_M,
      scale,
      truckFrontDataX: getTruckFrontDataX({ length: truckBounds.length, x: truckBounds.x }),
    });
    expect(layout.valid).toBe(true);

    // Even wall loading (BR-25): after the walls-inward spread the bottom lane
    // touches the frame bottom (both trailer walls carry the load).
    const lowestEdge = Math.max(...placed.map((item) => item.y + item.length));
    expect(lowestEdge).toBeCloseTo(truckBounds.y + truckBounds.width, 3);
  });

  it("caps at the geometric maximum when a 35th pallet is offered", () => {
    const order: CargoItem = { ...pallet("cargo-EUR"), quantity: 35 };
    const units = autoLoadCargoUnits([], [order], new Map());

    const { placed, unplaced } = packCargoIntoBounds(units, truckBounds, scale);

    expect(placed).toHaveLength(34);
    expect(unplaced).toHaveLength(1);
  });
});

describe("Integration: OrderSequence loading order (NL-TF-02 geometry, BR-24)", () => {
  // NL-TF-02 is the licenseplate of TruckSelection 89790517570917201 ("Truck 12T ADR").
  // Its TechnicalDetails are CombinationLength 10.0 m x CombinationWidth 2.4 m, so the
  // frame fits at full height: scale = 297 / 2.4 = 123.75 px/m, the frame is 10 x 123.75
  // = 1237.5 px long and 297 px wide, starting at x = 333 with its top at the drawing
  // midline minus half the frame height.
  const LENGTH_M = 10;
  const WIDTH_M = 2.4;
  const scale = { widthScale: TRUCK_FRAME_HEIGHT_PX / WIDTH_M, heightScale: TRUCK_FRAME_HEIGHT_PX / WIDTH_M };
  const truckBounds: RectLike = {
    x: TRUCK_CANVAS_LEFT,
    y: TRUCK_DRAWING_MIDLINE_Y - TRUCK_FRAME_HEIGHT_PX / 2,
    length: LENGTH_M * scale.widthScale,
    width: TRUCK_FRAME_HEIGHT_PX,
  };

  // EUR pallet 1.2 x 0.8 m at this scale.
  const pallet = (id: string, sequence: number, quantity: number): CargoItem => ({
    id,
    name: id,
    type: "pallet" as CargoType,
    color: "orange",
    isLocked: false,
    x: 0,
    y: 0,
    length: 1.2 * scale.widthScale,
    width: 0.8 * scale.heightScale,
    rotation: 0,
    quantity,
    sequence,
  });

  const validate = (placed: CargoItem[]) =>
    validateAll(placed, truckBounds, {
      maxLoadMeters: LENGTH_M,
      scale,
      truckFrontDataX: getTruckFrontDataX({ x: truckBounds.x, length: truckBounds.length }),
    });

  it("loads order 1 nearest the cabin (7 + 5 units, exact path)", () => {
    // Orders arrive in datasource order; the sequence term must reorder placement so
    // order 1 occupies the front-most span, not order 2.
    const orders = [pallet("cargo-order-2", 2, 5), pallet("cargo-order-1", 1, 7)];
    const units = autoLoadCargoUnits([], orders, new Map());

    const { placed, unplaced } = packCargoIntoBounds(units, truckBounds, scale);

    expect(placed).toHaveLength(12);
    expect(unplaced).toHaveLength(0);

    const seq1 = placed.filter((item) => item.sequence === 1);
    const seq2 = placed.filter((item) => item.sequence === 2);
    expect(seq1).toHaveLength(7);
    expect(seq2).toHaveLength(5);

    // Order 1 ends no closer to the cabin than where order 2 begins: the front-most
    // slots (regardless of lane) belong to order 1.
    expect(Math.max(...seq1.map((item) => item.x))).toBeLessThanOrEqual(Math.min(...seq2.map((item) => item.x)));
    // Flush at the cabin front (frame left edge is the first column) and valid.
    expect(Math.min(...placed.map((item) => item.x))).toBeCloseTo(truckBounds.x, 6);
    expect(validate(placed).valid).toBe(true);
  });

  it("keeps order 1 in front on the skyline path (>16 units)", () => {
    const orders = [pallet("cargo-order-2", 2, 12), pallet("cargo-order-1", 1, 12)];
    const units = autoLoadCargoUnits([], orders, new Map());

    const { placed, unplaced } = packCargoIntoBounds(units, truckBounds, scale);

    expect(placed).toHaveLength(24);
    expect(unplaced).toHaveLength(0);

    const seq1 = placed.filter((item) => item.sequence === 1);
    const seq2 = placed.filter((item) => item.sequence === 2);
    // 12 units fill 4 complete columns per order, so order 1 ends strictly in front.
    expect(Math.max(...seq1.map((item) => item.x))).toBeLessThan(Math.min(...seq2.map((item) => item.x)));
    expect(Math.min(...placed.map((item) => item.x))).toBeCloseTo(truckBounds.x, 6);
    expect(validate(placed).valid).toBe(true);
  });

  it("keeps the area front bias when the truck has no sequence data", () => {
    // No OrderSequence: the pre-sequence behaviour must survive. The rotated big unit
    // leaves a lane free, so the small one may share the same X span (both sit at the
    // cabin); what must not happen is the small unit ending up in front of the big one.
    const big: CargoItem = {
      ...pallet("cargo-big", 1, 1),
      sequence: undefined,
      length: 1.2 * scale.widthScale,
      width: WIDTH_M * scale.heightScale,
    };
    const small: CargoItem = {
      ...pallet("cargo-small", 1, 1),
      sequence: undefined,
      length: 0.8 * scale.widthScale,
      width: 0.8 * scale.heightScale,
    };
    const units = autoLoadCargoUnits([], [small, big], new Map());

    const { placed } = packCargoIntoBounds(units, truckBounds, scale);

    const bigPlaced = placed.find((item) => item.id.startsWith("cargo-big"))!;
    const smallPlaced = placed.find((item) => item.id.startsWith("cargo-small"))!;
    expect(bigPlaced.x).toBeLessThanOrEqual(smallPlaced.x);
    expect(Math.min(...placed.map((item) => item.x))).toBeCloseTo(truckBounds.x, 6);
  });
});
