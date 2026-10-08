import type { TruckItem } from "../../core/types/viewModels/TruckItem";
import { loadMendixObject } from "../mendix/mendixLoaders";
import { extractTechnicalDetailsData } from "../mendix/mendixMappers";
import { computeScale, truckSelectionToTruckItem } from "./truckAdapter";
import { getReferenceGuids } from "../mendix/mendixAssociations";
import { getObjectGuid, isMendixRuntime } from "../mendix/mendixRuntime";
import {
  TRUCK_SELECTION_RESOURCE_INSTANCE_ASSOCIATIONS,
  RESOURCE_INSTANCE_RESOURCE_ASSOCIATIONS,
  RESOURCE_TECHNICAL_DETAILS_ASSOCIATIONS,
} from "../mendix/mendixSchema";

export interface LoadedTruckResult {
  truck: TruckItem | null;
  scale: { widthScale: number; heightScale: number };
  truckGuid: string | null;
}

/**
 * Loads truck dimensions by following the association chain:
 * TruckSelection -> ResourceInstance -> Resource -> TechnicalDetails
 */
export const loadTruckAndScale = async (truckRef: string | undefined): Promise<LoadedTruckResult> => {
  if (!truckRef) {
    return { truck: null, scale: { widthScale: 1, heightScale: 1 }, truckGuid: null };
  }

  try {
    // Step 1: Load TruckSelection
    const truckSelectionObj = await loadMendixObject(truckRef);
    if (!truckSelectionObj) {
      return { truck: null, scale: { widthScale: 1, heightScale: 1 }, truckGuid: null };
    }
    const truckGuid = getObjectGuid(truckSelectionObj) ?? truckRef;

    // Step 2: Get ResourceInstance GUIDs from TruckSelection
    const resourceInstanceGuids = getReferenceGuids(truckSelectionObj, TRUCK_SELECTION_RESOURCE_INSTANCE_ASSOCIATIONS);

    if (resourceInstanceGuids.length === 0) {
      if (isMendixRuntime()) {
        console.warn(
          `loadTruckAndScale: TruckSelection ${truckGuid} has no ResourceInstance linked (tried: ${TRUCK_SELECTION_RESOURCE_INSTANCE_ASSOCIATIONS.join(", ")})`
        );
      }
      return createDefaultTruckResult(truckGuid);
    }

    // Step 3: Load first ResourceInstance (take first one)
    const resourceInstanceGuid = resourceInstanceGuids[0];
    const resourceInstanceObj = await loadMendixObject(resourceInstanceGuid);
    if (!resourceInstanceObj) {
      return createDefaultTruckResult(truckGuid);
    }

    // Step 4: Get Resource GUID from ResourceInstance
    const resourceGuids = getReferenceGuids(resourceInstanceObj, RESOURCE_INSTANCE_RESOURCE_ASSOCIATIONS);

    if (resourceGuids.length === 0) {
      if (isMendixRuntime()) {
        console.warn(`loadTruckAndScale: ResourceInstance ${resourceInstanceGuid} has no Resource linked`);
      }
      return createDefaultTruckResult(truckGuid);
    }

    // Step 5: Load Resource
    const resourceGuid = resourceGuids[0];
    const resourceObj = await loadMendixObject(resourceGuid);
    if (!resourceObj) {
      return createDefaultTruckResult(truckGuid);
    }

    // Step 6: Get TechnicalDetails GUID from Resource
    const technicalDetailsGuids = getReferenceGuids(resourceObj, RESOURCE_TECHNICAL_DETAILS_ASSOCIATIONS);

    if (technicalDetailsGuids.length === 0) {
      if (isMendixRuntime()) {
        console.warn(`loadTruckAndScale: Resource ${resourceGuid} has no TechnicalDetails linked`);
      }
      return createDefaultTruckResult(truckGuid);
    }

    // Step 7: Load TechnicalDetails (1-1, take first)
    const technicalDetailsGuid = technicalDetailsGuids[0];
    const technicalDetailsObj = await loadMendixObject(technicalDetailsGuid);
    if (!technicalDetailsObj) {
      return createDefaultTruckResult(truckGuid);
    }

    // Step 8: Extract dimensions from TechnicalDetails
    const techData = extractTechnicalDetailsData(technicalDetailsObj);
    if (!techData) {
      return createDefaultTruckResult(truckGuid);
    }

    // Step 9: Build TruckSelectionData from TechnicalDetails + TruckSelection GUID
    const truckData = {
      id: truckGuid,
      code: techData.nameResource,
      truckType: "Tauliner" as const,
      maxPayloadKg: 24000,
      axleCount: 2,
      internalLengthMeter: techData.hangerLengthMeter,
      internalWidthMeter: techData.hangerWidthMeter,
      internalHeightMeter: 2.7, // Not in TechnicalDetails, use default
      maxLoadMeters: techData.hangerLengthMeter,
    };

    const scale = computeScale(truckData);
    const truck = truckSelectionToTruckItem(truckData, scale);

    return { truck, scale, truckGuid };
  } catch (err) {
    console.error("Failed to load TruckSelection:", err);
    return { truck: null, scale: { widthScale: 1, heightScale: 1 }, truckGuid: null };
  }
};

/**
 * Loads truck item with pre-computed scale (used for reloads)
 */
export const loadTruckItem = async (
  truckRef: string | undefined,
  scale: { widthScale: number; heightScale: number }
): Promise<TruckItem | null> => {
  const result = await loadTruckAndScale(truckRef);
  return result.truck;
};

function createDefaultTruckResult(truckGuid: string): LoadedTruckResult {
  const truckData = {
    id: truckGuid,
    code: "TRUCK",
    truckType: "Tauliner" as const,
    maxPayloadKg: 24000,
    axleCount: 2,
    internalLengthMeter: 13.6,
    internalWidthMeter: 2.45,
    internalHeightMeter: 2.7,
    maxLoadMeters: 13.6,
  };
  const scale = computeScale(truckData);
  const truck = truckSelectionToTruckItem(truckData, scale);
  return { truck, scale, truckGuid };
}
