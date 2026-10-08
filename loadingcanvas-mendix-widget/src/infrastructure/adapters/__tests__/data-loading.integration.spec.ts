import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { CanvasController } from "../../../state/CanvasController";
import { loadTruckAndScale } from "../truckLoader";
import { loadCargoItems } from "../cargoLoader";
import { loadPackingPlan } from "../planLoader";

// Options shape of mx.data.get as used by loadMendixObject/Objects/List (mendixLoaders.ts).
type MxGetOptions = {
  guid?: string;
  guids?: string[];
  xpath?: string;
  callback: (result: unknown) => void;
  error?: (err: Error) => void;
};

// Mock Mendix runtime at the infrastructure boundary
const mockMxData = {
  get: jest.fn<(options: MxGetOptions) => void>(),
  create: jest.fn(),
  remove: jest.fn(),
  commit: jest.fn(),
  action: jest.fn(),
};

beforeEach(() => {
  (globalThis as { mx?: unknown }).mx = { data: mockMxData };
  jest.clearAllMocks();
});

// Queue one mx.data.get response: loadMendixObject resolves a single object,
// loadMendixObjects/loadMendixList resolve an array.
const respondWith = (result: unknown) => (options: MxGetOptions) => options.callback(result);

// MxObject-shaped mock: getGuid + get/set/getAttributes satisfy isMxObject(), so
// association reads (getReferenceGuids) and toPlainObject work against it.
const makeMx = (guid: string, attrs: Record<string, unknown>) => ({
  getGuid: (): string => guid,
  get: (name: string): unknown => (name in attrs ? attrs[name] : null),
  set: (): void => undefined,
  getAttributes: (): string[] => Object.keys(attrs),
});

// Truck load follows the association chain TruckSelection → ResourceInstance →
// Resource → TechnicalDetails (truckLoader.ts), one mx.data.get per hop.
const enqueueTruckChain = (truckGuid: string, lengthM: number, widthM: number) => {
  const truckSelection = makeMx(truckGuid, { "TCSLoadingMeter.TruckSelection_ResourceInstance": ["ri-1"] });
  const resourceInstance = makeMx("ri-1", { "TCSTransportModule.ResourceInstance_Resource": ["res-1"] });
  const resource = makeMx("res-1", { "DataModelModule.Resource_TechnicalDetails": ["td-1"] });
  const technicalDetails = makeMx("td-1", {
    NameResource: "Tauliner",
    CombinationLength: lengthM,
    CombinationWidth: widthM,
  });
  mockMxData.get
    .mockImplementationOnce(respondWith(truckSelection))
    .mockImplementationOnce(respondWith(resourceInstance))
    .mockImplementationOnce(respondWith(resource))
    .mockImplementationOnce(respondWith(technicalDetails));
};

describe("Integration: Data Loading Pipeline (Container → Infrastructure → State)", () => {
  it("loads truck → computes scale → loads cargo → loads plan → hydrates controller", async () => {
    // 1. Truck chain (TruckSelection → ResourceInstance → Resource → TechnicalDetails)
    enqueueTruckChain("truck-1", 13.6, 2.45);

    // 2. Load truck + scale
    const { truck, scale, truckGuid } = await loadTruckAndScale("truck-1");
    expect(truck).not.toBeNull();
    expect(scale.widthScale).toBeGreaterThan(0);
    expect(scale.heightScale).toBeGreaterThan(0);
    expect(truckGuid).toBe("truck-1");

    // 3. Cargo pipeline: TransportOrders → PackingUnits → PackingTypes batches
    mockMxData.get
      .mockImplementationOnce(
        respondWith([
          makeMx("order-1", {
            TransportOrderNo: "TO-1",
            "TCSTransportModule.TransportOrder_PackingUnit": ["pu-1"],
          }),
        ])
      )
      .mockImplementationOnce(
        respondWith([
          makeMx("pu-1", {
            "DataModelModule.PackingUnit_PackingType": "type-1",
            Length: 1.2,
            Width: 0.8,
            Height: 1.6,
            WeightKg: 500,
          }),
        ])
      )
      .mockImplementationOnce(respondWith([makeMx("type-1", { E_PackingType: "EUR_PALLET" })]));

    // 4. Load cargo
    const cargo = await loadCargoItems(["order-1"], scale);
    expect(cargo.length).toBeGreaterThan(0);
    // Cargo ids stay keyed by the TransportOrder GUID (cargoAdapter contract).
    expect(cargo[0].id).toBe("cargo-order-1");
    expect(cargo[0].length).toBeCloseTo(1.2 * scale.widthScale);

    // 5. No existing plan for this truck
    mockMxData.get.mockImplementationOnce(respondWith([]));

    // 6. Load plan
    const planItems = await loadPackingPlan(truckGuid!, scale, ["order-1"]);
    expect(Array.isArray(planItems)).toBe(true);

    // 7. Hydrate controller (State layer)
    const controller = new CanvasController({
      initialItems: [...cargo, ...planItems],
      canvasWidth: 1800,
      canvasHeight: 600,
      scale,
      truck,
    });

    const state = controller.getState();
    expect(state.cargos.length).toBe(cargo.length + planItems.length);
    expect(state.scale.widthScale).toBe(scale.widthScale);
    expect(state.scale.heightScale).toBe(scale.heightScale);
    expect(state.truck).toEqual(truck);
  });

  it("loadPlan filters out items whose TransportOrder was removed from TruckSelection", async () => {
    // Truck loaded, scale computed
    enqueueTruckChain("truck-1", 13.6, 2.45);
    const { scale, truckGuid } = await loadTruckAndScale("truck-1");

    // Saved plan has 2 items: order-1 (current) and order-2 (removed).
    // Plan lookup: PackingPlans list → PackingPlanItems list → tooltip meta batch.
    mockMxData.get
      .mockImplementationOnce(
        respondWith([makeMx("plan-1", { "TCSLoadingMeter.PackingPlan_TruckSelection": "truck-1" })])
      )
      .mockImplementationOnce(
        respondWith([
          makeMx("item-1", {
            "TCSLoadingMeter.PackingPlanItem_PackingPlan": "plan-1",
            "TCSLoadingMeter.PackingPlanItem_TransportOrder": "order-1",
            PositionX: 1,
            PositionY: 1,
            Length: 1.2,
            Width: 0.8,
            Rotation: 0,
            Color: "orange",
          }),
          makeMx("item-2", {
            "TCSLoadingMeter.PackingPlanItem_PackingPlan": "plan-1",
            "TCSLoadingMeter.PackingPlanItem_TransportOrder": "order-2",
            PositionX: 2,
            PositionY: 2,
            Length: 1.2,
            Width: 0.8,
            Rotation: 0,
            Color: "orange",
          }),
        ])
      )
      // Tooltip meta batch: only the surviving order-1 is re-loaded
      .mockImplementationOnce(respondWith([makeMx("order-1", { TransportOrderNo: "TO-1" })]));

    // Load plan WITH current order guids (only order-1)
    const planItems = await loadPackingPlan(truckGuid!, scale, ["order-1"]);

    // Only order-1 item should be restored
    expect(planItems.length).toBe(1);
    expect(planItems[0].id).toContain("order-1");
  });
});
