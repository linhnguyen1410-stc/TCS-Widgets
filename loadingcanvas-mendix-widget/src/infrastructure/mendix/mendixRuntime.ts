import type { MxData, MxObject } from "../../core/types/mx";
import Big from "big.js";

export const isMendixRuntime = (): boolean => {
  return typeof window !== "undefined" && typeof window.mx !== "undefined" && typeof window.mx.data?.get === "function";
};

export const getMx = (): MxData | null => {
  if (!isMendixRuntime()) {
    return null;
  }
  return window.mx!.data!;
};

export type MendixDecimal = Big;

export const toBig = (val: number): MendixDecimal => {
  if (!Number.isFinite(val)) {
    throw new Error(`Cannot convert non-finite value to Mendix Decimal: ${val}`);
  }
  return new Big(val);
};

export const getObjectGuid = (obj: unknown): string | undefined => {
  if (typeof obj === "string") {
    return obj;
  }
  if (!obj || typeof obj !== "object") {
    return undefined;
  }
  const candidate = obj as Partial<MxObject> & { guid?: string; id?: string };
  if (typeof candidate.getGuid === "function") {
    return candidate.getGuid();
  }
  if (typeof candidate.getGUID === "function") {
    return candidate.getGUID();
  }
  return candidate.guid ?? candidate.id;
};

export const isMxObject = (obj: unknown): obj is MxObject => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as MxObject).get === "function" &&
    typeof (obj as MxObject).set === "function" &&
    typeof (obj as MxObject).getAttributes === "function"
  );
};

export const setMxAttribute = (obj: unknown, attribute: string, value: unknown, context: string): void => {
  if (!isMxObject(obj)) {
    throw new Error(`${context}: created value is not a Mendix object`);
  }
  try {
    obj.set(attribute, value);
  } catch (error) {
    throw new Error(`${context}: failed to set ${attribute}`, { cause: error });
  }
};

const MENDIX_DECIMAL_SCALE = 8;

type DecimalConstructor = new (value: number | string) => unknown;

const getDecimalConstructor = (obj: unknown, attribute: string, context: string): DecimalConstructor => {
  if (!isMxObject(obj)) {
    throw new Error(`${context}: created value is not a Mendix object`);
  }

  const tryGetConstructor = (attr: string): DecimalConstructor | null => {
    const currentValue = obj.get(attr);
    if (currentValue !== null && typeof currentValue === "object" && typeof currentValue.constructor === "function") {
      return currentValue.constructor as DecimalConstructor;
    }
    return null;
  };

  const constructor = tryGetConstructor(attribute);
  if (constructor) {
    return constructor;
  }

  // All Decimal attributes on the same MxObject share the same Mendix Decimal constructor.
  // If the target attribute has no default value, borrow the constructor from another
  // Decimal attribute that does (e.g. PositionX/Width/Height usually have defaults).
  const fallbackAttributes = ["PositionX", "PositionY", "Length", "Width", "LengthMeters", "WidthMeters", "WeightKg"];
  for (const attr of fallbackAttributes) {
    if (attr === attribute) {
      continue;
    }
    const fallback = tryGetConstructor(attr);
    if (fallback) {
      return fallback;
    }
  }

  throw new Error(`${context}: ${attribute} has no native Mendix Decimal default value`);
};

export const setMxDecimalAttribute = (obj: unknown, attribute: string, value: number, context: string): void => {
  if (!Number.isFinite(value)) {
    throw new Error(`${context}: ${attribute} must be a finite number`);
  }
  const Decimal = getDecimalConstructor(obj, attribute, context);
  const normalizedValue = new Big(value).round(MENDIX_DECIMAL_SCALE, Big.roundHalfUp).toFixed(MENDIX_DECIMAL_SCALE);
  setMxAttribute(obj, attribute, new Decimal(normalizedValue), context);
};

/**
 * Creates a mock MxObject for development/testing when Mendix runtime is not available.
 * Provides default values for common entity types.
 */
export const createMockMxObject = <T extends Record<string, unknown>>(
  entity:
    | "TruckSelection"
    | "TransportOrder"
    | "PackingUnit"
    | "PackingType"
    | "PackingPlan"
    | "LoadingPlanItem"
    | "ResourceInstance"
    | "Resource"
    | "TechnicalDetails",
  overrides: Partial<T> = {}
): MxObject & T => {
  const defaults: Record<string, Record<string, unknown>> = {
    TruckSelection: {
      TruckIndex: 1,
    },
    ResourceInstance: {
      Name: "Test ResourceInstance",
      LicensePlate: "ABC-123",
    },
    Resource: {
      Name: "Test Resource",
    },
    TechnicalDetails: {
      NameResource: "Test Truck",
      HangerLength: 13.6,
      HangerWidth: 2.45,
    },
    TransportOrder: { Name: "Test Order", TransportOrderID: "TO-001" },
    PackingUnit: { Length: 1.2, Width: 0.8, Height: 1.0, WeightKg: 500 },
    PackingType: { Name: "EUR Pallet", Length: 1.2, Width: 0.8, Height: 1.0 },
    PackingPlan: { PlanName: "Test Plan" },
    LoadingPlanItem: { PositionX: 0, PositionY: 0, Length: 1.2, Width: 0.8, Rotated: false, Sequence: 0 },
  };

  const base = defaults[entity] ?? {};
  const guid = `mock-${entity.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    getGuid: () => guid,
    get: (attr: string) => overrides[attr] ?? base[attr],
    set: () => undefined,
    getReference: () => undefined,
    getReferences: () => [],
    getAttributes: () => Object.keys(base),
  } as unknown as MxObject & T;
};
