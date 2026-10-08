import type { MxObject } from "../../core/types/mx";
import { getObjectGuid } from "./mendixRuntime";
import {
  DEFAULT_TRUCK_AXLE_COUNT,
  DEFAULT_TRUCK_HEIGHT_METER,
  DEFAULT_TRUCK_LENGTH_METER,
  DEFAULT_TRUCK_MAX_PAYLOAD_KG,
  DEFAULT_TRUCK_WIDTH_METER,
  type TruckSelectionData,
} from "../adapters/truckAdapter";
import {
  DEFAULT_HEIGHT_METER,
  DEFAULT_LENGTH_METER,
  DEFAULT_WEIGHT_KG,
  DEFAULT_WIDTH_METER,
  resolvePackingType,
  type PackingUnitData,
  type TransportOrderData,
} from "../adapters/cargoAdapter";
import { TECHNICAL_DETAILS_ATTRIBUTES } from "./mendixSchema";

export const toPlainObject = (obj: unknown): Record<string, unknown> => {
  if (!obj || typeof obj !== "object") {
    return {};
  }
  const anyObj = obj as Record<string, unknown>;

  // Check if it's a Mendix MxObject (has .get() method)
  if (typeof anyObj.get === "function" && typeof anyObj.getAttributes === "function") {
    const mxObject = obj as MxObject;
    const result: Record<string, unknown> = {};
    const guid = getObjectGuid(mxObject);

    if (guid) {
      result.id = guid;
      result.guid = guid;
    }

    if (typeof anyObj.getAttributes === "function") {
      const attrs = mxObject.getAttributes();
      for (const attr of attrs) {
        let val = mxObject.get(attr);
        // Handle Mendix Big.js decimal numbers
        if (
          val !== null &&
          typeof val === "object" &&
          typeof (val as { toNumber?: () => number }).toNumber === "function"
        ) {
          val = (val as { toNumber: () => number }).toNumber();
        }
        result[attr] = val;
        // camelCase alias
        const camel = attr.charAt(0).toLowerCase() + attr.slice(1);
        if (!(camel in result)) {
          result[camel] = val;
        }
        // lowercase alias
        const lower = attr.toLowerCase();
        if (!(lower in result)) {
          result[lower] = val;
        }
      }
    }
    return result;
  }

  // Already a plain JS object
  return { ...anyObj };
};

// First defined non-null value among the candidate keys, or the fallback.
const readRawValue = (raw: Record<string, unknown>, candidates: readonly string[], fallback: unknown): unknown => {
  for (const key of candidates) {
    const value = raw[key];
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return fallback;
};

export const extractTruckData = (obj: unknown, fallbackGuid?: string): TruckSelectionData | null => {
  if (!obj) {
    return null;
  }
  const raw = toPlainObject(obj);
  const id = String(raw.id ?? raw.guid ?? fallbackGuid ?? "truck-1");

  const length = Number(
    readRawValue(
      raw,
      [
        "internalLengthMeter",
        "InternalLengthMeter",
        "lengthMeter",
        "LengthMeter",
        "length",
        "Length",
        "internalLength",
        "InternalLength",
      ],
      DEFAULT_TRUCK_LENGTH_METER
    )
  );

  const width = Number(
    readRawValue(
      raw,
      [
        "internalWidthMeter",
        "InternalWidthMeter",
        "widthMeter",
        "WidthMeter",
        "width",
        "Width",
        "internalWidth",
        "InternalWidth",
      ],
      DEFAULT_TRUCK_WIDTH_METER
    )
  );

  const height = Number(
    readRawValue(
      raw,
      [
        "internalHeightMeter",
        "InternalHeightMeter",
        "heightMeter",
        "HeightMeter",
        "height",
        "Height",
        "internalHeight",
        "InternalHeight",
      ],
      DEFAULT_TRUCK_HEIGHT_METER
    )
  );

  const code = String(
    readRawValue(raw, ["code", "Code", "truckCode", "TruckCode", "trailerCode", "TrailerCode", "name", "Name"], "TRUCK")
  );

  // raw.* names are Mendix entity attributes and remain unchanged
  const truckType = readRawValue(
    raw,
    ["trailerType", "TrailerType", "type", "Type"],
    "Tauliner"
  ) as TruckSelectionData["truckType"];

  const maxPayloadKg = Number(
    readRawValue(
      raw,
      ["maxPayloadKg", "MaxPayloadKg", "maxPayload", "MaxPayload", "payloadKg", "PayloadKg", "payload", "Payload"],
      DEFAULT_TRUCK_MAX_PAYLOAD_KG
    )
  );

  const axleCount = Number(raw.axleCount ?? raw.AxleCount ?? raw.axles ?? raw.Axles ?? DEFAULT_TRUCK_AXLE_COUNT);

  const rawMaxLoad = raw.maxLoadMeters ?? raw.MaxLoadMeters ?? raw.maxLoadMeter ?? raw.MaxLoadMeter;
  const maxLoadMeters =
    rawMaxLoad !== undefined && rawMaxLoad !== null
      ? Number(rawMaxLoad)
      : length > 0
        ? length
        : DEFAULT_TRUCK_LENGTH_METER;

  return {
    id,
    code,
    truckType: truckType || "Tauliner",
    maxPayloadKg: isNaN(maxPayloadKg) ? DEFAULT_TRUCK_MAX_PAYLOAD_KG : maxPayloadKg,
    axleCount: isNaN(axleCount) ? DEFAULT_TRUCK_AXLE_COUNT : axleCount,
    internalLengthMeter: length > 0 ? length : DEFAULT_TRUCK_LENGTH_METER,
    internalWidthMeter: width > 0 ? width : DEFAULT_TRUCK_WIDTH_METER,
    internalHeightMeter: height > 0 ? height : DEFAULT_TRUCK_HEIGHT_METER,
    maxLoadMeters: maxLoadMeters > 0 ? maxLoadMeters : length > 0 ? length : DEFAULT_TRUCK_LENGTH_METER,
  };
};

export interface TechnicalDetailsData {
  nameResource: string;
  hangerLengthMeter: number;
  hangerWidthMeter: number;
}

export const extractTechnicalDetailsData = (obj: unknown): TechnicalDetailsData | null => {
  if (!obj) return null;

  const raw = toPlainObject(obj);

  const nameResource = String(
    readRawValue(raw, [TECHNICAL_DETAILS_ATTRIBUTES.nameResource, "nameResource", "nameresource"], "")
  );

  const length = Number(
    readRawValue(
      raw,
      [TECHNICAL_DETAILS_ATTRIBUTES.combinationLength, "combinationLength", "CombinationLength", "combinationlength"],
      DEFAULT_TRUCK_LENGTH_METER
    )
  );

  const width = Number(
    readRawValue(
      raw,
      [TECHNICAL_DETAILS_ATTRIBUTES.combinationWidth, "combinationWidth", "CombinationWidth", "combinationwidth"],
      DEFAULT_TRUCK_WIDTH_METER
    )
  );

  return {
    nameResource: nameResource || "TRUCK",
    hangerLengthMeter: length > 0 ? length : DEFAULT_TRUCK_LENGTH_METER,
    hangerWidthMeter: width > 0 ? width : DEFAULT_TRUCK_WIDTH_METER,
  };
};

export const extractTransportOrderData = (obj: unknown, fallbackGuid?: string): TransportOrderData | null => {
  if (!obj) {
    return null;
  }
  const raw = toPlainObject(obj);
  const id = String(raw.id ?? raw.guid ?? fallbackGuid ?? "");

  const length = Number(
    readRawValue(
      raw,
      ["lengthMeter", "LengthMeter", "length", "Length", "packingUnitLengthMeter", "PackingUnitLengthMeter"],
      1.2
    )
  );

  const width = Number(
    readRawValue(
      raw,
      ["widthMeter", "WidthMeter", "width", "Width", "packingUnitWidthMeter", "PackingUnitWidthMeter"],
      0.8
    )
  );

  const height = Number(
    readRawValue(
      raw,
      ["heightMeter", "HeightMeter", "height", "Height", "packingUnitHeightMeter", "PackingUnitHeightMeter"],
      1.6
    )
  );

  const transportOrderNo = String(readRawValue(raw, ["transportOrderNo", "TransportOrderNo"], ""));

  const name = String(
    readRawValue(
      raw,
      [
        "name",
        "Name",
        "transportOrderNo",
        "TransportOrderNo",
        "code",
        "Code",
        "orderNumber",
        "OrderNumber",
        "description",
        "Description",
      ],
      `Cargo ${id}`
    )
  );

  const rawType = String(
    readRawValue(raw, ["packingType", "PackingType", "type", "Type", "packageType", "PackageType"], "pallet")
  ).toLowerCase();

  const packingType = resolvePackingType(rawType);

  const weightKg = Number(
    readRawValue(raw, ["weightKg", "WeightKg", "weight", "Weight", "grossWeight", "GrossWeight"], DEFAULT_WEIGHT_KG)
  );

  const quantity = Number(readRawValue(raw, ["Quantity", "quantity", "Qty", "qty"], 1));

  const packingUnit: PackingUnitData = {
    id,
    name,
    lengthMeter: length > 0 ? length : DEFAULT_LENGTH_METER,
    widthMeter: width > 0 ? width : DEFAULT_WIDTH_METER,
    heightMeter: height > 0 ? height : DEFAULT_HEIGHT_METER,
    packingType,
    weightKg: isNaN(weightKg) ? DEFAULT_WEIGHT_KG : weightKg,
  };

  return {
    id,
    name,
    transportOrderNo: transportOrderNo || undefined,
    packingUnit,
    quantity: isNaN(quantity) ? 1 : quantity,
  };
};
