import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import Big from "big.js";
import {
  extractTechnicalDetailsData,
  extractTransportOrderData,
  filterByAssociationGuid,
  getReferenceGuids,
  loadCargoItems,
  loadPackingPlan,
  loadTruckAndScale,
  markTruckSelectionCompleteLoading,
  savePackingPlan,
  toBig,
} from "../mendixDataAdapter";
import type { PackingPlanState } from "../../adapters/stateAdapter";

describe("mendixDataAdapter Decimal conversion", () => {
  it("always returns a Big.js value for Mendix Decimal attributes", () => {
    const value = toBig(0.7881818181818182);

    expect(value).toBeInstanceOf(Big);
    expect(value.toString()).toBe("0.7881818181818182");
  });

  it("rejects non-finite Decimal values before calling MxObject.set", () => {
    expect(() => toBig(Number.NaN)).toThrow("Cannot convert non-finite value");
    expect(() => toBig(Number.POSITIVE_INFINITY)).toThrow("Cannot convert non-finite value");
  });

  it("filters retrieved objects by their Mendix association without XPath constraints", () => {
    const matching = {
      get: (name: string): unknown => (name === "PackingPlan_TruckSelection" ? "truck-1" : undefined),
      getAttributes: (): string[] => [],
      set: (): void => undefined,
    };
    const other = {
      get: (): unknown => "truck-2",
      getAttributes: (): string[] => [],
      set: (): void => undefined,
    };

    expect(filterByAssociationGuid([matching, other], ["PackingPlan_TruckSelection"], "truck-1")).toEqual([matching]);
  });
});

describe("extractTransportOrderData name fallback", () => {
  it("uses TransportOrderNo when no display name attribute exists", () => {
    const data = extractTransportOrderData({ TransportOrderNo: "TO-123" }, "order-guid-1");
    expect(data?.name).toBe("TO-123");
  });

  it("falls back to Cargo + guid when nothing else is available", () => {
    const data = extractTransportOrderData({}, "order-guid-1");
    expect(data?.name).toBe("Cargo order-guid-1");
  });
});

describe("getReferenceGuids", () => {
  const makeObj = (attrs: Record<string, unknown>) => ({
    get: (name: string): unknown => (name in attrs ? attrs[name] : null),
    set: (): void => undefined,
    getAttributes: (): string[] => Object.keys(attrs),
  });

  it("reads reference sets (GUID arrays)", () => {
    const obj = makeObj({ "TCSTransportModule.TransportOrder_PackingUnit": ["pu-1", "pu-2"] });
    expect(getReferenceGuids(obj, ["TCSTransportModule.TransportOrder_PackingUnit"])).toEqual(["pu-1", "pu-2"]);
  });

  it("reads single references and tries the next candidate when one is missing", () => {
    const obj = makeObj({ TransportOrder_PackingUnit: "pu-9" });
    expect(
      getReferenceGuids(obj, ["TCSTransportModule.TransportOrder_PackingUnit", "TransportOrder_PackingUnit"])
    ).toEqual(["pu-9"]);
  });

  it("returns an empty list for non-MxObject inputs", () => {
    expect(getReferenceGuids({ foo: 1 }, ["Some.Assoc"])).toEqual([]);
  });
});

describe("loadCargoItems PackingUnit enrichment", () => {
  const originalMx = (globalThis as { mx?: unknown }).mx;

  afterEach(() => {
    (globalThis as { mx?: unknown }).mx = originalMx;
  });

  it("resolves name, dimensions and packing type from the associated PackingUnit", async () => {
    const orderObj = {
      getGuid: (): string => "order-guid-1",
      get: (name: string): unknown =>
        name === "TCSTransportModule.TransportOrder_PackingUnit"
          ? ["pu-guid-1"]
          : name === "TransportOrderNo"
            ? "TO-123"
            : null,
      set: (): void => undefined,
      getAttributes: (): string[] => ["TransportOrderNo"],
    };

    const unitObj = {
      getGuid: (): string => "pu-guid-1",
      get: (name: string): unknown =>
        name === "DataModelModule.PackingUnit_PackingType"
          ? "type-guid-1"
          : name === "Length"
            ? { toNumber: () => 1.2 }
            : name === "Width"
              ? { toNumber: () => 0.8 }
              : name === "Height"
                ? { toNumber: () => 1.6 }
                : name === "WeightKg"
                  ? { toNumber: () => 500 }
                  : null,
      set: (): void => undefined,
      getAttributes: (): string[] => ["Length", "Width", "Height", "WeightKg"],
    };

    const typeObj = {
      getGuid: (): string => "type-guid-1",
      get: (name: string): unknown => (name === "E_PackingType" ? "EUR_PALLET" : null),
      set: (): void => undefined,
      getAttributes: (): string[] => ["E_PackingType"],
    };

    // loadCargoItems batches in order: TransportOrders, then PackingUnits, then PackingTypes.
    let callIndex = 0;
    const mxData = {
      get: jest.fn((options: { guids?: string[]; callback: (result: unknown) => void }) => {
        if (callIndex === 0) {
          callIndex++;
          options.callback([orderObj]);
        } else if (callIndex === 1) {
          callIndex++;
          options.callback([unitObj]);
        } else if (callIndex === 2) {
          callIndex++;
          options.callback([typeObj]);
        }
      }),
    };

    (globalThis as { mx?: unknown }).mx = { data: mxData };

    const items = await loadCargoItems(["order-guid-1"], { widthScale: 100, heightScale: 100 });

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("TO-123");
    expect(items[0].lengthM).toBe(1.2);
    expect(items[0].widthM).toBe(0.8);
    expect(items[0].type).toBe("pallet");
  });

  it("pairs each order with its own PackingUnit even when the batch responds out of order", async () => {
    const order1 = {
      getGuid: (): string => "order-1",
      get: (name: string): unknown => (name === "TCSTransportModule.TransportOrder_PackingUnit" ? ["pu-1"] : null),
      set: (): void => undefined,
      getAttributes: (): string[] => [],
    };
    const order2 = {
      getGuid: (): string => "order-2",
      get: (name: string): unknown => (name === "TCSTransportModule.TransportOrder_PackingUnit" ? ["pu-2"] : null),
      set: (): void => undefined,
      getAttributes: (): string[] => [],
    };

    const unit1 = {
      getGuid: (): string => "pu-1",
      get: (name: string): unknown =>
        name === "DataModelModule.PackingUnit_PackingType"
          ? "type-1"
          : name === "Length"
            ? { toNumber: () => 1.2 }
            : name === "Width"
              ? { toNumber: () => 0.8 }
              : null,
      set: (): void => undefined,
      getAttributes: (): string[] => ["Length", "Width"],
    };
    const unit2 = {
      getGuid: (): string => "pu-2",
      get: (name: string): unknown =>
        name === "DataModelModule.PackingUnit_PackingType"
          ? "type-2"
          : name === "Length"
            ? { toNumber: () => 2.4 }
            : name === "Width"
              ? { toNumber: () => 1.0 }
              : null,
      set: (): void => undefined,
      getAttributes: (): string[] => ["Length", "Width"],
    };

    const type1 = {
      getGuid: (): string => "type-1",
      get: (name: string): unknown => (name === "E_PackingType" ? "EUR_PALLET" : null),
      set: (): void => undefined,
      getAttributes: (): string[] => ["E_PackingType"],
    };
    const type2 = {
      getGuid: (): string => "type-2",
      get: (name: string): unknown => (name === "E_PackingType" ? "BOX" : null),
      set: (): void => undefined,
      getAttributes: (): string[] => ["E_PackingType"],
    };

    // Batches: orders first, units and types respond OUT of order; the keyed-by-guid
    // lookup must still pair each order with its own PackingUnit.
    let callIndex = 0;
    const mxData = {
      get: jest.fn((options: { guids?: string[]; callback: (result: unknown) => void }) => {
        if (callIndex === 0) {
          callIndex++;
          options.callback([order1, order2]);
        } else if (callIndex === 1) {
          callIndex++;
          options.callback([unit2, unit1]);
        } else if (callIndex === 2) {
          callIndex++;
          options.callback([type2, type1]);
        }
      }),
    };

    (globalThis as { mx?: unknown }).mx = { data: mxData };

    const items = await loadCargoItems(["order-1", "order-2"], { widthScale: 100, heightScale: 100 });

    expect(items).toHaveLength(2);
    expect(items[0].lengthM).toBe(1.2);
    expect(items[1].lengthM).toBe(2.4);
  });

  it("warns contextually before falling back to the item key when the TransportOrder association is unreadable", async () => {
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

    // No readable TransportOrder_PackingUnit reference: the adapter warns and still
    // produces an item keyed by the order, with the name resolved from TransportOrderNo.
    const orderObj = {
      getGuid: (): string => "order-1",
      get: (name: string): unknown => (name === "TransportOrderNo" ? "TO-123" : null),
      set: (): void => undefined,
      getAttributes: (): string[] => ["TransportOrderNo"],
    };

    const mxData = {
      get: jest.fn((options: { guids?: string[]; callback: (result: unknown) => void }) => {
        options.callback([orderObj]);
      }),
    };

    (globalThis as { mx?: unknown }).mx = { data: mxData };

    const items = await loadCargoItems(["order-1"], { widthScale: 100, heightScale: 100 });

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("TO-123");
    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  it("gives duplicate TransportOrder associations distinct instance ids so the canvas keeps every saved pallet", async () => {
    const order1 = {
      getGuid: (): string => "order-1",
      get: (name: string): unknown => (name === "TCSTransportModule.TransportOrder_PackingUnit" ? ["pu-1"] : null),
      set: (): void => undefined,
      getAttributes: (): string[] => [],
    };
    const order2 = {
      getGuid: (): string => "order-2",
      get: (name: string): unknown => (name === "TCSTransportModule.TransportOrder_PackingUnit" ? ["pu-2"] : null),
      set: (): void => undefined,
      getAttributes: (): string[] => [],
    };

    const unit1 = {
      getGuid: (): string => "pu-1",
      get: (name: string): unknown =>
        name === "DataModelModule.PackingUnit_PackingType"
          ? "type-1"
          : name === "Length"
            ? { toNumber: () => 1.2 }
            : name === "Width"
              ? { toNumber: () => 0.8 }
              : null,
      set: (): void => undefined,
      getAttributes: (): string[] => ["Length", "Width"],
    };
    const unit2 = {
      getGuid: (): string => "pu-2",
      get: (name: string): unknown =>
        name === "DataModelModule.PackingUnit_PackingType"
          ? "type-1"
          : name === "Length"
            ? { toNumber: () => 1.2 }
            : name === "Width"
              ? { toNumber: () => 0.8 }
              : null,
      set: (): void => undefined,
      getAttributes: (): string[] => ["Length", "Width"],
    };

    const type1 = {
      getGuid: (): string => "type-1",
      get: (name: string): unknown => (name === "E_PackingType" ? "EUR_PALLET" : null),
      set: (): void => undefined,
      getAttributes: (): string[] => ["E_PackingType"],
    };

    // Batches in loadCargoItems order: orders, then units, then types.
    let callIndex = 0;
    const mxData = {
      get: jest.fn((options: { guids?: string[]; callback: (result: unknown) => void }) => {
        if (callIndex === 0) {
          callIndex++;
          options.callback([order1, order2]);
        } else if (callIndex === 1) {
          callIndex++;
          options.callback([unit1, unit2]);
        } else if (callIndex === 2) {
          callIndex++;
          options.callback([type1]);
        }
      }),
    };

    (globalThis as { mx?: unknown }).mx = { data: mxData };

    const items = await loadCargoItems(["order-1", "order-2"], { widthScale: 100, heightScale: 100 });

    expect(items).toHaveLength(2);
    expect(items[0].id).not.toBe(items[1].id);
    expect(items[0].id).toMatch(/^cargo-/);
    expect(items[1].id).toMatch(/^cargo-/);
  });
});

describe("loadPackingPlan restores items for current orders only", () => {
  const originalMx = (globalThis as { mx?: unknown }).mx;

  afterEach(() => {
    (globalThis as { mx?: unknown }).mx = originalMx;
  });

  const makeMxObject = (attrs: Record<string, unknown>, guid: string) => ({
    get: (name: string): unknown => attrs[name] ?? null,
    set: (): void => undefined,
    getAttributes: (): string[] => Object.keys(attrs),
    getGuid: (): string => guid,
  });

  it("does not restore saved items whose order was removed from the TruckSelection", async () => {
    const planObj = makeMxObject(
      {
        "TCSLoadingMeter.PackingPlan_TruckSelection": "truck-1",
      },
      "plan-1"
    );

    const itemObj = makeMxObject(
      {
        "TCSLoadingMeter.PackingPlanItem_PackingPlan": "plan-1",
        "TCSLoadingMeter.PackingPlanItem_TransportOrder": "removed-order-guid",
        PositionX: { toNumber: () => 0 },
        PositionY: { toNumber: () => 0 },
        Length: { toNumber: () => 1.2 },
        Width: { toNumber: () => 0.8 },
        Rotation: 0,
        Color: "gray",
        LengthMeters: { toNumber: () => 1.2 },
        WidthMeters: { toNumber: () => 0.8 },
      },
      "item-1"
    );

    const mxData = {
      get: jest.fn((options: { xpath?: string; callback: (result: unknown) => void }) => {
        if (options.xpath === "//TCSLoadingMeter.PackingPlan") {
          options.callback([planObj]);
        } else if (options.xpath === "//TCSLoadingMeter.PackingPlanItem") {
          options.callback([itemObj]);
        } else {
          options.callback([]);
        }
      }),
    };

    (globalThis as { mx?: unknown }).mx = { data: mxData };

    const items = await loadPackingPlan("truck-1", { widthScale: 100, heightScale: 100 }, ["current-order-guid"]);

    expect(items).toHaveLength(0);
  });

  it("restores every saved item when no active order filter is supplied (backwards-compatible)", async () => {
    const planObj = makeMxObject(
      {
        "TCSLoadingMeter.PackingPlan_TruckSelection": "truck-1",
      },
      "plan-1"
    );

    const itemObj = makeMxObject(
      {
        "TCSLoadingMeter.PackingPlanItem_PackingPlan": "plan-1",
        "TCSLoadingMeter.PackingPlanItem_TransportOrder": "any-order-guid",
        PositionX: { toNumber: () => 0 },
        PositionY: { toNumber: () => 0 },
        Length: { toNumber: () => 1.2 },
        Width: { toNumber: () => 0.8 },
        Rotation: 0,
        Color: "gray",
        LengthMeters: { toNumber: () => 1.2 },
        WidthMeters: { toNumber: () => 0.8 },
      },
      "item-1"
    );

    const mxData = {
      get: jest.fn((options: { xpath?: string; callback: (result: unknown) => void }) => {
        if (options.xpath === "//TCSLoadingMeter.PackingPlan") {
          options.callback([planObj]);
        } else if (options.xpath === "//TCSLoadingMeter.PackingPlanItem") {
          options.callback([itemObj]);
        } else {
          options.callback([]);
        }
      }),
    };

    (globalThis as { mx?: unknown }).mx = { data: mxData };

    const items = await loadPackingPlan("truck-1", { widthScale: 100, heightScale: 100 });

    expect(items).toHaveLength(1);
    expect(items[0].lengthM).toBe(1.2);
  });
});

describe("savePackingPlan Decimal constructor fallback", () => {
  const originalMx = (globalThis as { mx?: unknown }).mx;

  const makeDecimal = (value: number) => ({
    toNumber: () => value,
    toString: () => String(value),
    constructor: class MockDecimal {
      v: number | string;
      constructor(value: number | string) {
        this.v = value;
      }
      toNumber = () => Number(this.v);
      toString = () => String(this.v);
    },
  });

  const makeMxObject = (guid: string, attrs: Record<string, unknown>) => ({
    get: (name: string): unknown => attrs[name] ?? null,
    set: (name: string, value: unknown): void => {
      attrs[name] = value;
    },
    getAttributes: (): string[] => Object.keys(attrs),
    getGuid: (): string => guid,
  });

  const makePlanItemObject = (guid: string) => {
    const attrs: Record<string, unknown> = {
      PositionX: makeDecimal(0),
      PositionY: makeDecimal(0),
      Length: makeDecimal(1.2),
      Width: makeDecimal(0.8),
      Height: makeDecimal(0.8),
      LengthMeters: null,
      WidthMeters: null,
      WeightKg: null,
    };
    return makeMxObject(guid, attrs);
  };

  beforeEach(() => {
    const planObj = makeMxObject("plan-1", {
      TCSLoadingMeter$PackingPlan_TruckSelection: "truck-1",
    });
    const existingItem = makeMxObject("item-old-1", {
      TCSLoadingMeter$PackingPlanItem_PackingPlan: "plan-1",
    });

    const mxData = {
      get: jest.fn((options: { xpath?: string; callback: (result: unknown) => void }) => {
        if (options.xpath === "//TCSLoadingMeter.PackingPlan") {
          options.callback([planObj]);
        } else if (options.xpath === "//TCSLoadingMeter.PackingPlanItem") {
          options.callback([existingItem]);
        } else {
          options.callback([]);
        }
      }),
      create: jest.fn((options: { entity: string; callback: (obj: unknown) => void }) => {
        if (options.entity === "TCSLoadingMeter.PackingPlanItem") {
          options.callback(makePlanItemObject(`item-new-${Math.random()}`));
        } else {
          options.callback(makeMxObject("plan-new", {}));
        }
      }),
      remove: jest.fn((options: { callback?: () => void }) => options.callback?.()),
      commit: jest.fn((options: { callback?: () => void }) => options.callback?.()),
      action: jest.fn(),
      rollback: jest.fn(),
    };

    (globalThis as { mx?: unknown }).mx = { data: mxData };
  });

  afterEach(() => {
    (globalThis as { mx?: unknown }).mx = originalMx;
  });

  it("borrows the Decimal constructor from another attribute when LengthMeters has no default value", async () => {
    const state: PackingPlanState = {
      truck: null,
      cargos: [
        {
          id: "cargo-1",
          name: "Cargo 1",
          type: "pallet",
          x: 0,
          y: 0,
          length: 1.2,
          width: 0.8,
          rotation: 0,
          color: "gray",
          isLocked: false,
          lengthM: 1.2,
          widthM: 0.8,
          weightKg: 500,
        },
      ],
    };

    const result = await savePackingPlan("truck-1", state, { widthScale: 1, heightScale: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].lengthM).toBe(1.2);
    expect(result.items[0].widthM).toBe(0.8);
  });
});

describe("extractTechnicalDetailsData", () => {
  it("reads NameResource, CombinationLength, CombinationWidth from TechnicalDetails", () => {
    const data = extractTechnicalDetailsData({
      NameResource: "My Tauliner",
      CombinationLength: 13.6,
      CombinationWidth: 2.45,
    });
    expect(data).toEqual({
      nameResource: "My Tauliner",
      hangerLengthMeter: 13.6,
      hangerWidthMeter: 2.45,
    });
  });

  it("falls back to defaults when attributes missing", () => {
    const data = extractTechnicalDetailsData({});
    expect(data?.hangerLengthMeter).toBe(13.6);
    expect(data?.hangerWidthMeter).toBe(2.45);
    expect(data?.nameResource).toBe("TRUCK");
  });

  it("handles lowercase attribute variants", () => {
    const data = extractTechnicalDetailsData({
      nameresource: "Lowercase Truck",
      combinationlength: 12.5,
      combinationwidth: 2.5,
    });
    expect(data).toEqual({
      nameResource: "Lowercase Truck",
      hangerLengthMeter: 12.5,
      hangerWidthMeter: 2.5,
    });
  });
});

describe("loadTruckAndScale association chain", () => {
  const originalMx = (globalThis as { mx?: unknown }).mx;

  afterEach(() => {
    (globalThis as { mx?: unknown }).mx = originalMx;
  });

  const makeMxObject = (attrs: Record<string, unknown>, guid: string) => ({
    get: (name: string): unknown => attrs[name] ?? null,
    set: (): void => undefined,
    getAttributes: (): string[] => Object.keys(attrs),
    getGuid: (): string => guid,
  });

  it("follows TruckSelection -> ResourceInstance -> Resource -> TechnicalDetails", async () => {
    const technicalDetailsObj = makeMxObject(
      {
        NameResource: "Test Tauliner",
        CombinationLength: 13.6,
        CombinationWidth: 2.45,
      },
      "tech-1"
    );

    const resourceObj = makeMxObject(
      {
        "DataModelModule.Resource_TechnicalDetails": "tech-1",
      },
      "resource-1"
    );

    const resourceInstanceObj = makeMxObject(
      {
        "TCSTransportModule.ResourceInstance_Resource": "resource-1",
      },
      "ri-1"
    );

    const truckSelectionObj = makeMxObject(
      {
        TruckSelection_ResourceInstance: ["ri-1"],
      },
      "truck-1"
    );

    let callIndex = 0;
    const mxData = {
      get: jest.fn((options: { guid?: string; callback: (result: unknown) => void }) => {
        if (callIndex === 0) {
          // First call: TruckSelection
          callIndex++;
          options.callback(truckSelectionObj);
        } else if (callIndex === 1) {
          // Second call: ResourceInstance
          callIndex++;
          options.callback(resourceInstanceObj);
        } else if (callIndex === 2) {
          // Third call: Resource
          callIndex++;
          options.callback(resourceObj);
        } else if (callIndex === 3) {
          // Fourth call: TechnicalDetails
          callIndex++;
          options.callback(technicalDetailsObj);
        }
      }),
    };

    (globalThis as { mx?: unknown }).mx = { data: mxData };

    const result = await loadTruckAndScale("truck-1");

    expect(result.truck).not.toBeNull();
    expect(result.truckGuid).toBe("truck-1");
    expect(result.truck?.code).toBe("Test Tauliner");
    // length/width are in pixels (GeometryItem)
    expect(result.truck?.length).toBeCloseTo(1453);
    expect(result.truck?.width).toBeCloseTo(261.75, 1);
  });

  it("falls back to defaults when ResourceInstance missing", async () => {
    const truckSelectionObj = makeMxObject(
      {
        // No TruckSelection_ResourceInstance association
      },
      "truck-1"
    );

    const mxData = {
      get: jest.fn((options: { guid?: string; callback: (result: unknown) => void }) => {
        options.callback(truckSelectionObj);
      }),
    };

    (globalThis as { mx?: unknown }).mx = { data: mxData };

    const result = await loadTruckAndScale("truck-1");

    expect(result.truck).not.toBeNull();
    expect(result.truckGuid).toBe("truck-1");
    expect(result.truck?.code).toBe("TRUCK");
    expect(result.truck?.length).toBeCloseTo(1453);
    expect(result.truck?.width).toBeCloseTo(261.75, 1);
  });

  it("falls back to defaults when TechnicalDetails missing", async () => {
    const resourceObj = makeMxObject(
      {
        // No TechnicalDetails association
      },
      "resource-1"
    );

    const resourceInstanceObj = makeMxObject(
      {
        "TCSTransportModule.ResourceInstance_Resource": "resource-1",
      },
      "ri-1"
    );

    const truckSelectionObj = makeMxObject(
      {
        TruckSelection_ResourceInstance: ["ri-1"],
      },
      "truck-1"
    );

    let callIndex = 0;
    const mxData = {
      get: jest.fn((options: { guid?: string; callback: (result: unknown) => void }) => {
        if (callIndex === 0) {
          callIndex++;
          options.callback(truckSelectionObj);
        } else if (callIndex === 1) {
          callIndex++;
          options.callback(resourceInstanceObj);
        } else if (callIndex === 2) {
          callIndex++;
          options.callback(resourceObj);
        }
      }),
    };

    (globalThis as { mx?: unknown }).mx = { data: mxData };

    const result = await loadTruckAndScale("truck-1");

    expect(result.truck).not.toBeNull();
    expect(result.truckGuid).toBe("truck-1");
    expect(result.truck?.length).toBeCloseTo(1453);
    expect(result.truck?.width).toBeCloseTo(261.75, 1);
  });
});

describe("markTruckSelectionCompleteLoading (BR-47 flag write)", () => {
  const originalMx = (globalThis as { mx?: unknown }).mx;

  afterEach(() => {
    (globalThis as { mx?: unknown }).mx = originalMx;
  });

  const makeTruckSelection = () => ({
    getGuid: (): string => "truck-1",
    get: (name: string): unknown => (name === "CompleteLoading" ? false : null),
    set: jest.fn(),
    getAttributes: (): string[] => ["CompleteLoading"],
  });

  it("sets CompleteLoading to true and commits the TruckSelection", async () => {
    const truckSelection = makeTruckSelection();
    const commit = jest.fn(({ callback }: { callback: () => void; mxobjs?: unknown[] }) => callback());
    const mxData = {
      get: jest.fn(({ callback }: { callback: (result: unknown) => void }) => callback(truckSelection)),
      commit,
    };
    (globalThis as { mx?: unknown }).mx = { data: mxData };

    await markTruckSelectionCompleteLoading("truck-1");

    expect(truckSelection.set).toHaveBeenCalledWith("CompleteLoading", true);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit.mock.calls[0][0].mxobjs).toEqual([truckSelection]);
  });

  it("throws a contextual error when the TruckSelection cannot be loaded", async () => {
    const mxData = {
      get: jest.fn(({ callback }: { callback: (result: unknown) => void }) => callback(null)),
    };
    (globalThis as { mx?: unknown }).mx = { data: mxData };

    await expect(markTruckSelectionCompleteLoading("missing")).rejects.toThrow(/could not be loaded/);
  });

  it("propagates commit errors", async () => {
    const truckSelection = makeTruckSelection();
    const mxData = {
      get: jest.fn(({ callback }: { callback: (result: unknown) => void }) => callback(truckSelection)),
      commit: jest.fn(({ error }: { error: (err: Error) => void }) => error(new Error("commit boom"))),
    };
    (globalThis as { mx?: unknown }).mx = { data: mxData };

    await expect(markTruckSelectionCompleteLoading("truck-1")).rejects.toThrow("commit boom");
  });

  it("resolves silently in the dev fallback (no Mendix runtime)", async () => {
    (globalThis as { mx?: unknown }).mx = undefined;

    await expect(markTruckSelectionCompleteLoading("truck-1")).resolves.toBeUndefined();
  });
});
