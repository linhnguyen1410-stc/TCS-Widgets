import { describe, it, expect } from "@jest/globals";
import { validateAll, isLoadingComplete, getExpectedUnitCount } from "../validationRules";
import { getTruckBoundsFromItem, getTruckFrontDataX } from "../boundaryRules";
import { CargoItem, CargoType } from "../../../core/types/viewModels/CargoItem";
import { TruckItem } from "../../../core/types/viewModels/TruckItem";

describe("Integration: Verify Gate (Toolbar -> ValidationRules)", () => {
  const makeCargo = (overrides: Partial<CargoItem> = {}): CargoItem => ({
    id: "cargo-1",
    name: "Pallet",
    type: "pallet" as CargoType,
    color: "orange",
    isLocked: false,
    x: 100,
    y: 100,
    length: 120,
    width: 80,
    rotation: 0,
    quantity: 1,
    ...overrides,
  });

  const makeTruck = (overrides: Partial<TruckItem> = {}): TruckItem => ({
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
    ...overrides,
  });

  // Helper to serialize result for safe assertion
  const serializeResult = (result: ReturnType<typeof validateAll>) => ({
    valid: result.valid,
    errors: [...result.errors],
    errorCount: result.errors.length,
  });

  it("Verify passes: all units placed + layout valid (no overlap, in bounds, LM ok)", () => {
    const availableCargo = [makeCargo({ id: "cargo-1" })];
    const availableCargoItems: CargoItem[] = [];
    // Inside the truck band (truck frame starts at x:333, y:152) so the layout is valid.
    const items = [makeCargo({ id: "cargo-1-0", x: 400, y: 200 })];
    const truck = makeTruck();

    const bounds = getTruckBoundsFromItem(truck);
    const truckFrontDataX = getTruckFrontDataX(truck);
    const result = validateAll(items, bounds, {
      maxLoadMeters: truck.maxLoadMeters,
      scale: { widthScale: 100, heightScale: 100 },
      truckFrontDataX,
    });
    const loadComplete = isLoadingComplete(availableCargo, items.length, availableCargoItems.length);

    const serialized = serializeResult(result);
    expect(loadComplete).toBe(true);
    expect(serialized.valid).toBe(true);
    expect(serialized.errorCount).toBe(0);
  });

  it("Verify fails: load incomplete (cargo still in list)", () => {
    const availableCargo = [makeCargo({ id: "cargo-1", quantity: 2 })];
    const availableCargoItems = [makeCargo({ id: "cargo-1-1" })];
    const items = [makeCargo({ id: "cargo-1-0", x: 100, y: 100 })];
    const truck = makeTruck();

    const loadComplete = isLoadingComplete(availableCargo, items.length, availableCargoItems.length);
    expect(loadComplete).toBe(false);
    expect(getExpectedUnitCount(availableCargo)).toBe(2);
  });

  it("Verify fails: overlap detected (strict gate BR-45)", () => {
    const availableCargo = [makeCargo({ id: "cargo-1" }), makeCargo({ id: "cargo-2" })];
    const availableCargoItems: CargoItem[] = [];
    const items = [makeCargo({ id: "cargo-1-0", x: 100, y: 100 }), makeCargo({ id: "cargo-2-0", x: 110, y: 110 })];
    const truck = makeTruck();

    const bounds = getTruckBoundsFromItem(truck);
    const truckFrontDataX = getTruckFrontDataX(truck);
    const result = validateAll(items, bounds, {
      maxLoadMeters: truck.maxLoadMeters,
      scale: { widthScale: 100, heightScale: 100 },
      truckFrontDataX,
    });

    const serialized = serializeResult(result);
    expect(serialized.valid).toBe(false);
    expect(serialized.errors).toContain("OVERLAP");
  });

  it("Verify fails: out of bounds (outside truck frame)", () => {
    const availableCargo = [makeCargo({ id: "cargo-1" })];
    const availableCargoItems: CargoItem[] = [];
    const items = [makeCargo({ id: "cargo-1-0", x: 50, y: 50 })];
    const truck = makeTruck();

    const bounds = getTruckBoundsFromItem(truck);
    const truckFrontDataX = getTruckFrontDataX(truck);
    const result = validateAll(items, bounds, {
      maxLoadMeters: truck.maxLoadMeters,
      scale: { widthScale: 100, heightScale: 100 },
      truckFrontDataX,
    });

    const serialized = serializeResult(result);
    expect(serialized.valid).toBe(false);
    expect(serialized.errors).toContain("OUT_OF_BOUNDS");
  });

  it("Verify fails: load meters exceeded (BR-17)", () => {
    const availableCargo = [makeCargo({ id: "cargo-1" }), makeCargo({ id: "cargo-2" })];
    const availableCargoItems: CargoItem[] = [];
    // Flush 7.15 m blocks inside the truck form one 14.3 m deck span, past the 13.6 m limit.
    const items = [
      makeCargo({ id: "cargo-1-0", x: 350, y: 200, length: 715 }),
      makeCargo({ id: "cargo-2-0", x: 1065, y: 200, length: 715 }),
    ];
    const truck = makeTruck({ maxLoadMeters: 13.6 });

    const bounds = getTruckBoundsFromItem(truck);
    const truckFrontDataX = getTruckFrontDataX(truck);
    const result = validateAll(items, bounds, {
      maxLoadMeters: truck.maxLoadMeters,
      scale: { widthScale: 100, heightScale: 100 },
      truckFrontDataX,
    });

    const serialized = serializeResult(result);
    expect(serialized.valid).toBe(false);
    expect(serialized.errors).toContain("LM_EXCEEDED");
  });

  it("Verify dedupes repeated error kinds in message (CH-0020)", () => {
    const availableCargo = [makeCargo({ id: "cargo-1" }), makeCargo({ id: "cargo-2" }), makeCargo({ id: "cargo-3" })];
    const availableCargoItems: CargoItem[] = [];
    const items = [
      makeCargo({ id: "cargo-1-0", x: 100, y: 100 }),
      makeCargo({ id: "cargo-2-0", x: 110, y: 110 }),
      makeCargo({ id: "cargo-3-0", x: 120, y: 120 }),
    ];
    const truck = makeTruck();

    const bounds = getTruckBoundsFromItem(truck);
    const truckFrontDataX = getTruckFrontDataX(truck);
    const result = validateAll(items, bounds, {
      maxLoadMeters: truck.maxLoadMeters,
      scale: { widthScale: 100, heightScale: 100 },
      truckFrontDataX,
    });

    const serialized = serializeResult(result);
    const overlapErrors = serialized.errors.filter((e) => e === "OVERLAP");
    expect(overlapErrors.length).toBe(3);
    const deduped = Array.from(new Set(serialized.errors));
    const dedupedOverlap = deduped.filter((e) => e === "OVERLAP");
    expect(dedupedOverlap.length).toBe(1);
  });

  it("Verify: rotation-aware load meter calculation (BR-26)", () => {
    const availableCargo = [makeCargo({ id: "cargo-1" })];
    const availableCargoItems: CargoItem[] = [];
    // The 90° turn projects the 0.8 m width onto X (0.8 m ≤ 1 m); unrotated the
    // 1.2 m length would exceed the 1 m budget. Placed inside the truck band.
    const items = [makeCargo({ id: "cargo-1-0", x: 400, y: 200, rotation: 90 })];
    const truck = makeTruck({ maxLoadMeters: 1 });

    const bounds = getTruckBoundsFromItem(truck);
    const truckFrontDataX = getTruckFrontDataX(truck);
    const result = validateAll(items, bounds, {
      maxLoadMeters: truck.maxLoadMeters,
      scale: { widthScale: 100, heightScale: 100 },
      truckFrontDataX,
    });

    const serialized = serializeResult(result);
    expect(serialized.valid).toBe(true);
    expect(serialized.errors).not.toContain("LM_EXCEEDED");
  });
});
