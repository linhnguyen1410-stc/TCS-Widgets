import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import { meterToPixel } from "../../core/utils/coordinates";
import { DEFAULT_AXIS_SCALE, getRotatedScreenSize, type AxisScale } from "../../domain/rules/rotationRules";
import { fromCargoId, toCargoId } from "../../core/utils/cargoId";
/**
 * Shape of a PackingUnit as it arrives from Mendix.
 * PackingUnit has: Length, Width, Height (in meters).
 */
export interface PackingUnitData {
  id: string;
  name?: string;
  lengthMeter: number;
  widthMeter: number;
  heightMeter?: number;
  packingType: "pallet" | "box";
  weightKg?: number;
}

// Shared fallback dimensions (meters) used when no PackingUnit data resolves;
// every adapter mapping must reuse these instead of repeating literals.
export const DEFAULT_LENGTH_METER = 1.2;
export const DEFAULT_WIDTH_METER = 0.8;
export const DEFAULT_HEIGHT_METER = 1.6;
export const DEFAULT_WEIGHT_KG = 500;

/**
 * Shape of a TransportOrder as it arrives from Mendix.
 * TransportOrder (1-*) → PackingUnit
 */
export interface TransportOrderData {
  id: string;
  name?: string;
  transportOrderNo?: string; // Transport Order Number
  productName?: string; // Product name from TransportOrder -> Product association
  producerName?: string; // Company name via TransportOrder -> Producer association
  companyFromName?: string; // Company name via TransportOrder -> Company_From association
  companyToName?: string; // Company name via TransportOrder -> Company_To association
  packingUnit?: PackingUnitData;
  quantity?: number;
  // OrderSequence of the TransportOrder within its TruckSelection (BR-24).
  sequence?: number;
}

/**
 * Convert a PackingUnit (meters) to a CargoItem (pixels) using the given scale.
 *
 * @param packingUnit - The PackingUnit data from Mendix
 * @param scale - Pixel-to-meter scale factor
 * @param position - Initial canvas position (pixels)
 * @param quantity - Quantity of items this transport order represents (default 1)
 * @param transportOrderNo - Transport Order Number (optional)
 * @param productName - Product name from TransportOrder -> Product association (optional)
 * @param producerName - Producer company name (optional)
 * @param companyFromName - From company name (optional)
 * @param companyToName - To company name (optional)
 * @returns A CargoItem view model ready for the canvas
 */
export const packingUnitToCargoItem = (
  packingUnit: PackingUnitData,
  scale: { widthScale: number; heightScale: number },
  position: { x: number; y: number } = { x: 0, y: 0 },
  quantity: number = 1,
  transportOrderNo?: string,
  productName?: string,
  producerName?: string,
  companyFromName?: string,
  companyToName?: string
): CargoItem => {
  const color = packingUnit.packingType === "pallet" ? "orange" : "blue";
  const name = packingUnit.name ?? `Cargo ${packingUnit.id}`;

  return {
    id: toCargoId(packingUnit.id),
    name,
    x: position.x,
    y: position.y,
    length: meterToPixel(packingUnit.lengthMeter, scale.widthScale),
    width: meterToPixel(packingUnit.widthMeter, scale.heightScale),
    rotation: 0,
    color,
    type: packingUnit.packingType,
    isLocked: false,
    lengthM: packingUnit.lengthMeter,
    widthM: packingUnit.widthMeter,
    weightKg: packingUnit.weightKg,
    quantity,
    transportOrderNo,
    productName,
    producerName,
    companyFromName,
    companyToName,
  };
};

/**
 * Convert a list of TransportOrders to CargoItems.
 * Each TransportOrder has one PackingUnit.
 */
export const transportOrdersToCargoItems = (
  orders: TransportOrderData[],
  scale: { widthScale: number; heightScale: number }
): CargoItem[] => {
  return orders
    .filter((order) => order.packingUnit)
    .map((order) => ({
      ...packingUnitToCargoItem(
        order.packingUnit!,
        scale,
        { x: 0, y: 0 },
        order.quantity ?? 1,
        order.transportOrderNo,
        order.productName,
        order.producerName,
        order.companyFromName,
        order.companyToName
      ),
      sequence: order.sequence,
    }));
};

/**
 * Serialize a CargoItem back to meter-based data for persistence.
 */
export const cargoItemToPackingUnitData = (item: CargoItem, scale: number): PackingUnitData => {
  return {
    id: fromCargoId(item.id),
    name: item.name,
    lengthMeter: item.lengthM ?? pixelToMeter(item.length, scale),
    widthMeter: item.widthM ?? pixelToMeter(item.width, scale),
    heightMeter: 0,
    packingType: item.type,
    weightKg: item.weightKg,
  };
};

const readPositiveNumber = (plain: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = plain[key];
    if (value === undefined || value === null) {
      continue;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
};

const readNonEmptyString = (plain: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = plain[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return undefined;
};

export const resolvePackingType = (value: unknown): "pallet" | "box" => {
  return String(value ?? "")
    .toLowerCase()
    .includes("box")
    ? "box"
    : "pallet";
};

export const packingTypeFromColor = (color: string | undefined): "pallet" | "box" => {
  return typeof color === "string" && color.toLowerCase().includes("blue") ? "box" : "pallet";
};

// Merges the associated PackingUnit values (Name/Length/Width/Height/packing type) into the
// TransportOrder data. The CargoItem id stays based on the TransportOrder GUID so the save
// flow can restore the TransportOrder association correctly. The optional `meta` carries the
// tooltip/popup names (Product + Producer/From/To companies) resolved in transportOrderMeta.
export const applyPackingUnitData = (
  order: TransportOrderData,
  unitPlain: Record<string, unknown> | null,
  packingTypeValue?: string | null,
  meta?: Pick<TransportOrderData, "productName" | "producerName" | "companyFromName" | "companyToName">
): TransportOrderData => {
  if (!unitPlain && !meta) {
    return order;
  }

  const current = order.packingUnit;
  const unitName = unitPlain ? readNonEmptyString(unitPlain, ["Name", "name"]) : undefined;

  return {
    ...order,
    ...(meta ?? {}),
    name: unitName ?? order.name,
    packingUnit: unitPlain
      ? {
          id: current?.id ?? order.id,
          name: unitName ?? current?.name,
          lengthMeter:
            readPositiveNumber(unitPlain, ["Length", "length"]) ?? current?.lengthMeter ?? DEFAULT_LENGTH_METER,
          widthMeter: readPositiveNumber(unitPlain, ["Width", "width"]) ?? current?.widthMeter ?? DEFAULT_WIDTH_METER,
          heightMeter:
            readPositiveNumber(unitPlain, ["Height", "height"]) ?? current?.heightMeter ?? DEFAULT_HEIGHT_METER,
          packingType: resolvePackingType(packingTypeValue),
          weightKg:
            readPositiveNumber(unitPlain, ["WeightKg", "weightKg", "GrossWeight", "grossWeight"]) ?? current?.weightKg,
        }
      : current,
  };
};

/**
 * Helper: convert pixel to meter (inverse of meterToPixel).
 */
const pixelToMeter = (pixel: number, scale: number): number => {
  return pixel / scale;
};

// Visual bounding rectangle of a CargoItem; rotated extents are projected
// through the matching axis scales when a non-uniform scale is given.
export const getCargoItemRect = (
  item: CargoItem,
  scale: AxisScale = DEFAULT_AXIS_SCALE
): { x: number; y: number; length: number; width: number } => {
  const visual = getRotatedScreenSize({ length: item.length, width: item.width }, item.rotation, scale);
  return { x: item.x, y: item.y, length: visual.length, width: visual.width };
};
