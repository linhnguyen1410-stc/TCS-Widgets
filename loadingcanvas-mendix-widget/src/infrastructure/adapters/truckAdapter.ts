import type { TruckItem } from "../../core/types/viewModels/TruckItem";
import type { Truck } from "../../core/types/Truck";
import { meterToPixel } from "../../core/utils/coordinates";
import type { AxisScale } from "../../domain/rules/rotationRules";
import {
  TRUCK_CANVAS_LEFT,
  TRUCK_CANVAS_WIDTH,
  TRUCK_FRAME_HEIGHT_PX,
  TRUCK_DRAWING_MIDLINE_Y,
} from "../../core/constants/canvas";

export type ScalePair = AxisScale;

export interface TruckSelectionData {
  id: string;
  code?: string;
  truckType?: "Tauliner" | "DryVan" | "Reefer" | "Flatbed" | "Container" | "Curtainsider";
  maxPayloadKg?: number;
  axleCount?: number;
  internalLengthMeter: number;
  internalWidthMeter: number;
  internalHeightMeter: number;
  maxLoadMeters?: number;
}

// Shared fallback dimensions (meters) for trucks lacking attribute values;
// extractTruckData reuses these so every consumer sees identical defaults.
export const DEFAULT_TRUCK_LENGTH_METER = 13.6;
export const DEFAULT_TRUCK_WIDTH_METER = 2.45;
export const DEFAULT_TRUCK_HEIGHT_METER = 2.7;
export const DEFAULT_TRUCK_MAX_PAYLOAD_KG = 24000;
export const DEFAULT_TRUCK_AXLE_COUNT = 2;

export const truckSelectionToTruckItem = (
  truck: TruckSelectionData,
  scale: ScalePair,
  position: { x: number; y: number } = { x: TRUCK_CANVAS_LEFT, y: TRUCK_DRAWING_MIDLINE_Y }
): TruckItem => {
  const frameLength = Math.min(TRUCK_CANVAS_WIDTH, meterToPixel(truck.internalLengthMeter, scale.widthScale));
  const frameWidth = Math.min(TRUCK_FRAME_HEIGHT_PX, meterToPixel(truck.internalWidthMeter, scale.heightScale));
  // Center the frame on the truck drawing's midline (center-top backdrop) so it
  // stays centered inside the drawn truck bed; position.y is the midline.
  const frameY = position.y - frameWidth / 2;
  return {
    id: truck.id,
    code: truck.code ?? "TRUCK",
    truckType: truck.truckType ?? "Tauliner",
    maxPayloadKg: truck.maxPayloadKg ?? 0,
    axleCount: truck.axleCount ?? 2,
    maxLoadMeters: truck.maxLoadMeters ?? truck.internalLengthMeter,
    x: position.x,
    y: frameY,
    length: frameLength,
    width: frameWidth,
    rotation: 0,
  };
};

export const truckToTruckItem = (
  truck: Truck,
  scale: ScalePair,
  position: { x: number; y: number } = { x: TRUCK_CANVAS_LEFT, y: TRUCK_DRAWING_MIDLINE_Y }
): TruckItem => {
  const frameLength = Math.min(TRUCK_CANVAS_WIDTH, meterToPixel(truck.internalLengthMeter, scale.widthScale));
  const frameWidth = Math.min(TRUCK_FRAME_HEIGHT_PX, meterToPixel(truck.internalWidthMeter, scale.heightScale));
  // Center the frame on the truck drawing's midline (center-top backdrop) so it
  // stays centered inside the drawn truck bed; position.y is the midline.
  const frameY = position.y - frameWidth / 2;
  return {
    id: truck.id,
    code: truck.code,
    truckType: truck.truckType,
    maxPayloadKg: truck.maxPayloadKg,
    axleCount: truck.axleCount,
    maxLoadMeters: truck.maxLoadMeters ?? truck.internalLengthMeter,
    x: position.x,
    y: frameY,
    length: frameLength,
    width: frameWidth,
    rotation: 0,
  };
};

export const computeScale = (truck: TruckSelectionData, padding: number = 0): ScalePair => {
  const lengthM = truck.internalLengthMeter > 0 ? truck.internalLengthMeter : DEFAULT_TRUCK_LENGTH_METER;
  const widthM = truck.internalWidthMeter > 0 ? truck.internalWidthMeter : DEFAULT_TRUCK_WIDTH_METER;

  // Frame sizing rule: trucks that fit render at exactly TRUCK_FRAME_HEIGHT_PX
  // with length scaled to the truck's true aspect; trucks too long cap the
  // length at TRUCK_CANVAS_WIDTH and shrink the height. The mappers center
  // every frame on the truck drawing midline (TRUCK_DRAWING_MIDLINE_Y).

  const scaleFromHeight = Math.max(TRUCK_FRAME_HEIGHT_PX - padding, 100) / widthM;
  const resultingLength = lengthM * scaleFromHeight;

  if (resultingLength <= TRUCK_CANVAS_WIDTH - padding) {
    // Fits at full height: use height-bound scale (same height, proportional length)
    const scale = scaleFromHeight;
    return { widthScale: scale, heightScale: scale };
  }
  // Too long at full height: cap length at max, reduce height proportionally
  const scaleFromLength = Math.max(TRUCK_CANVAS_WIDTH - padding, 100) / lengthM;
  const scale = scaleFromLength;
  return { widthScale: scale, heightScale: scale };
};
