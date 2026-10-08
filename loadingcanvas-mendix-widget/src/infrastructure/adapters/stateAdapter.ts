import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import type { TruckItem } from "../../core/types/viewModels/TruckItem";
import { pixelToMeter } from "../../core/utils/coordinates";
import type { AxisScale } from "../../domain/rules/rotationRules";

/**
 * The persisted slice of canvas state. Defined here (not imported from State)
 * so the persistence layer never depends on the live-store shape.
 */
export interface PackingPlanState {
  truck: TruckItem | null;
  cargos: CargoItem[];
}

/**
 * Shape of a saved packing plan item (persisted to Mendix).
 */
export interface PackingPlanItemData {
  id: string;
  name: string;
  type: "pallet" | "box";
  x: number; // meters
  y: number; // meters
  length: number; // meters (X extent)
  width: number; // meters (Y extent)
  rotation: number;
  color: string;
  lengthM?: number;
  widthM?: number;
  weightKg?: number;
}

/**
 * Shape of a saved packing plan (persisted to Mendix).
 */
export interface PackingPlanData {
  truckId: string | null;
  items: PackingPlanItemData[];
}

// Single vocabulary with domain: AxisScale (widthScale = X-axis/length scale).
type PlanScale = AxisScale;

/**
 * Serialize the current canvas state into a packing plan for persistence.
 * Converts all pixel coordinates back to meters using the matching axis scale.
 */
// Only the persisted slice is serialized; interaction fields are irrelevant here.
export const serializePlan = (state: PackingPlanState, scale: number | PlanScale): PackingPlanData => {
  const widthScale = typeof scale === "number" ? scale : scale.widthScale;
  const heightScale = typeof scale === "number" ? scale : scale.heightScale;

  return {
    truckId: state.truck?.id ?? null,
    items: state.cargos.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      x: pixelToMeter(item.x, widthScale),
      y: pixelToMeter(item.y, heightScale),
      length: pixelToMeter(item.length, widthScale),
      width: pixelToMeter(item.width, heightScale),
      rotation: item.rotation,
      color: item.color,
      lengthM: item.lengthM,
      widthM: item.widthM,
      weightKg: item.weightKg,
    })),
  };
};

/**
 * Deserialize a packing plan back into CargoItems for the canvas.
 * Converts all meter coordinates to pixels using the matching axis scale.
 */
export const deserializePlan = (plan: PackingPlanData, scale: number | PlanScale): CargoItem[] => {
  const widthScale = typeof scale === "number" ? scale : scale.widthScale;
  const heightScale = typeof scale === "number" ? scale : scale.heightScale;

  return plan.items.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    x: item.x * widthScale,
    y: item.y * heightScale,
    length: item.length * widthScale,
    width: item.width * heightScale,
    rotation: item.rotation as 0 | 90 | 180 | 270,
    color: item.color,
    isLocked: false,
    lengthM: item.lengthM,
    widthM: item.widthM,
    weightKg: item.weightKg,
  }));
};
