import { describe, it, expect } from "@jest/globals";
import { serializePlan, deserializePlan } from "../stateAdapter";
import type { PackingPlanState } from "../stateAdapter";
import type { CargoItem } from "../../../core/types/viewModels/CargoItem";

describe("stateAdapter", () => {
  const scale = 50;

  const createCargoItem = (overrides: Partial<CargoItem> = {}): CargoItem => ({
    id: "cargo-1",
    name: "Pallet A",
    x: 100,
    y: 200,
    length: 60,
    width: 40,
    rotation: 0,
    color: "orange",
    type: "pallet",
    isLocked: false,
    lengthM: 1.2,
    widthM: 0.9,
    weightKg: 500,
    ...overrides,
  });

  const createCanvasState = (cargos: CargoItem[]): PackingPlanState => ({
    truck: {
      id: "truck-1",
      code: "TRUCK-001",
      truckType: "DryVan",
      maxPayloadKg: 20000,
      axleCount: 2,
      maxLoadMeters: 12,
      x: 20,
      y: 20,
      length: 600,
      width: 125,
      rotation: 0,
    },
    cargos,
  });

  describe("serializePlan", () => {
    it("should serialize canvas state to PackingPlanData with meter values", () => {
      const state = createCanvasState([createCargoItem()]);
      const plan = serializePlan(state, scale);

      expect(plan.truckId).toBe("truck-1");
      expect(plan.items).toHaveLength(1);
      expect(plan.items[0].id).toBe("cargo-1");
      expect(plan.items[0].name).toBe("Pallet A");
      expect(plan.items[0].type).toBe("pallet");
      expect(plan.items[0].x).toBe(2); // 100 / 50
      expect(plan.items[0].y).toBe(4); // 200 / 50
      expect(plan.items[0].length).toBe(1.2); // 60 / 50
      expect(plan.items[0].width).toBe(0.8); // 40 / 50
      expect(plan.items[0].rotation).toBe(0);
      expect(plan.items[0].color).toBe("orange");
      expect(plan.items[0].lengthM).toBe(1.2);
      expect(plan.items[0].weightKg).toBe(500);
    });

    it("should serialize multiple items", () => {
      const state = createCanvasState([
        createCargoItem({ id: "cargo-1", x: 100, y: 100 }),
        createCargoItem({ id: "cargo-2", x: 200, y: 200, type: "box", color: "blue" }),
      ]);
      const plan = serializePlan(state, scale);
      expect(plan.items).toHaveLength(2);
      expect(plan.items[0].id).toBe("cargo-1");
      expect(plan.items[1].id).toBe("cargo-2");
    });

    it("should handle null truck", () => {
      const state = createCanvasState([createCargoItem()]);
      state.truck = null;
      const plan = serializePlan(state, scale);
      expect(plan.truckId).toBeNull();
    });

    it("should handle empty cargos", () => {
      const state = createCanvasState([]);
      const plan = serializePlan(state, scale);
      expect(plan.items).toEqual([]);
    });
  });

  describe("deserializePlan", () => {
    it("should deserialize PackingPlanData to CargoItems with pixel values", () => {
      const plan = {
        truckId: "truck-1",
        items: [
          {
            id: "cargo-1",
            name: "Pallet A",
            type: "pallet" as const,
            x: 2,
            y: 4,
            length: 1.2,
            width: 0.8,
            rotation: 0 as const,
            color: "orange",
            lengthM: 1.2,
            widthM: 0.9,
            weightKg: 500,
          },
        ],
      };
      const items = deserializePlan(plan, scale);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("cargo-1");
      expect(items[0].x).toBe(100); // 2 * 50
      expect(items[0].y).toBe(200); // 4 * 50
      expect(items[0].length).toBe(60); // 1.2 * 50
      expect(items[0].width).toBe(40); // 0.8 * 50
      expect(items[0].rotation).toBe(0);
      expect(items[0].color).toBe("orange");
      expect(items[0].isLocked).toBe(false);
      expect(items[0].lengthM).toBe(1.2);
      expect(items[0].widthM).toBe(0.9);
      expect(items[0].weightKg).toBe(500);
    });

    it("should deserialize multiple items", () => {
      const plan = {
        truckId: "truck-1",
        items: [
          {
            id: "cargo-1",
            name: "Pallet A",
            type: "pallet" as const,
            x: 2,
            y: 4,
            length: 1.2,
            width: 0.8,
            rotation: 0 as const,
            color: "orange",
          },
          {
            id: "cargo-2",
            name: "Box B",
            type: "box" as const,
            x: 4,
            y: 6,
            length: 1.0,
            width: 1.0,
            rotation: 90 as const,
            color: "blue",
          },
        ],
      };
      const items = deserializePlan(plan, scale);
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe("cargo-1");
      expect(items[1].id).toBe("cargo-2");
      expect(items[1].rotation).toBe(90);
    });

    it("should handle empty plan", () => {
      const plan = { truckId: "truck-1", items: [] };
      const items = deserializePlan(plan, scale);
      expect(items).toEqual([]);
    });

    it("should handle missing optional fields", () => {
      const plan = {
        truckId: "truck-1",
        items: [
          {
            id: "cargo-1",
            name: "Pallet A",
            type: "pallet" as const,
            x: 2,
            y: 4,
            length: 1.2,
            width: 0.8,
            rotation: 0 as const,
            color: "orange",
          },
        ],
      };
      const items = deserializePlan(plan, scale);
      expect(items[0].lengthM).toBeUndefined();
      expect(items[0].widthM).toBeUndefined();
      expect(items[0].weightKg).toBeUndefined();
    });
  });

  describe("round-trip (serialize â†’ deserialize)", () => {
    it("should preserve item data through serialize/deserialize cycle", () => {
      const originalState = createCanvasState([
        createCargoItem({ id: "cargo-1", x: 100, y: 200, rotation: 90 }),
        createCargoItem({ id: "cargo-2", x: 300, y: 400, type: "box", color: "blue", rotation: 180 }),
      ]);
      const plan = serializePlan(originalState, scale);
      const restoredItems = deserializePlan(plan, scale);

      expect(restoredItems).toHaveLength(2);
      expect(restoredItems[0].id).toBe("cargo-1");
      expect(restoredItems[0].x).toBe(100);
      expect(restoredItems[0].y).toBe(200);
      expect(restoredItems[0].rotation).toBe(90);
      expect(restoredItems[1].id).toBe("cargo-2");
      expect(restoredItems[1].x).toBe(300);
      expect(restoredItems[1].y).toBe(400);
      expect(restoredItems[1].rotation).toBe(180);
    });
  });
});
