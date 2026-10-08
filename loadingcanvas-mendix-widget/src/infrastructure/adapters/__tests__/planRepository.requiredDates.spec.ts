import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { savePackingPlan } from "../planRepository";
import { PackingPlanState } from "../stateAdapter";

describe("savePackingPlan required DateTime attributes", () => {
  const originalMx = (globalThis as { mx?: unknown }).mx;

  const makeMxObject = (guid: string, attrs: Record<string, unknown>) => ({
    get: (name: string): unknown => attrs[name] ?? null,
    set: (name: string, value: unknown): void => {
      attrs[name] = value;
    },
    getAttributes: (): string[] => Object.keys(attrs),
    getGuid: (): string => guid,
  });

  // Decimal-typed defaults so setMxDecimalAttribute can borrow the native ctor
  // (same harness pattern as mendixDataAdapter.spec.ts makePlanItemObject).
  const makeDecimal = (value: number) => ({
    toNumber: () => value,
    toString: () => String(value),
    constructor: class MockDecimal {
      v: number | string;
      constructor(initial: number | string) {
        this.v = initial;
      }
      toNumber = () => Number(this.v);
      toString = () => String(this.v);
    },
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
      },
    ],
  };

  afterEach(() => {
    (globalThis as { mx?: unknown }).mx = originalMx;
  });

  it("sets CreatedDate and ModifiedDate when creating a new plan", async () => {
    const planObj = makeMxObject("plan-new", {});
    const mxData = {
      get: jest.fn((options: { xpath?: string; callback: (result: unknown) => void }) => options.callback([])),
      create: jest.fn((options: { entity: string; callback: (obj: unknown) => void }) => {
        if (options.entity === "TCSLoadingMeter.PackingPlan") {
          options.callback(planObj);
        } else {
          options.callback(makePlanItemObject(`item-${Math.random()}`));
        }
      }),
      remove: jest.fn((options: { callback?: () => void }) => options.callback?.()),
      commit: jest.fn((options: { callback?: () => void }) => options.callback?.()),
    };
    (globalThis as { mx?: unknown }).mx = { data: mxData };

    const result = await savePackingPlan("truck-1", state, { widthScale: 1, heightScale: 1 });

    expect(planObj.get("CreatedDate")).toBeInstanceOf(Date);
    expect(planObj.get("ModifiedDate")).toBeInstanceOf(Date);
    expect(mxData.commit).toHaveBeenCalledWith(expect.objectContaining({ mxobjs: [planObj, expect.any(Object)] }));
    expect(result.items).toHaveLength(1);
  });

  it("touches only ModifiedDate on an existing plan", async () => {
    const created = new Date("2026-01-01T00:00:00Z");
    const planObj = makeMxObject("plan-1", {
      CreatedDate: created,
      "TCSLoadingMeter.PackingPlan_TruckSelection": "truck-1",
    });
    const mxData = {
      get: jest.fn((options: { xpath?: string; callback: (result: unknown) => void }) => {
        if (options.xpath === "//TCSLoadingMeter.PackingPlan") {
          options.callback([planObj]);
        } else {
          options.callback([]);
        }
      }),
      create: jest.fn((options: { entity: string; callback: (obj: unknown) => void }) => {
        options.callback(makePlanItemObject(`item-${Math.random()}`));
      }),
      remove: jest.fn((options: { callback?: () => void }) => options.callback?.()),
      commit: jest.fn((options: { callback?: () => void }) => options.callback?.()),
    };
    (globalThis as { mx?: unknown }).mx = { data: mxData };

    await savePackingPlan("truck-1", state, { widthScale: 1, heightScale: 1 });

    expect(planObj.get("CreatedDate")).toBe(created);
    expect(planObj.get("ModifiedDate")).toBeInstanceOf(Date);
    expect(mxData.commit).toHaveBeenCalledWith(expect.objectContaining({ mxobjs: expect.arrayContaining([planObj]) }));
  });
});
