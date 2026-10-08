import { getReferenceGuids } from "../mendix/mendixAssociations";
import { loadMendixObject, loadMendixObjects } from "../mendix/mendixLoaders";
import { getObjectGuid, isMendixRuntime, isMxObject } from "../mendix/mendixRuntime";
import { toPlainObject } from "../mendix/mendixMappers";
import {
  ORDER_SEQUENCE_TRANSPORT_ORDER_ASSOCIATIONS,
  TRANSPORT_ORDER_SEQUENCE_ATTRIBUTES,
  TRUCK_SELECTION_ORDER_SEQUENCE_ASSOCIATIONS,
} from "../mendix/mendixSchema";

// Resolves the planned loading order per TransportOrder: TruckSelection ->
// TransportOrderSequence (OrderSequence) -> TransportOrder. Loading is then packed
// with sequence 1 nearest the cabin (BR-24). Returns an empty map when the truck
// carries no sequence data, so packing falls back to the area-based front bias.
export const loadOrderSequenceByOrderGuid = async (
  truckSelectionGuid: string | null | undefined
): Promise<Map<string, number>> => {
  const sequenceByOrderGuid = new Map<string, number>();
  if (!truckSelectionGuid) {
    return sequenceByOrderGuid;
  }

  try {
    const truckSelection = await loadMendixObject(truckSelectionGuid);
    if (!isMxObject(truckSelection)) {
      if (isMendixRuntime()) {
        console.warn(
          `loadOrderSequenceByOrderGuid: TruckSelection ${truckSelectionGuid} could not be loaded for sequence lookup`
        );
      }
      return sequenceByOrderGuid;
    }

    const sequenceGuids = getReferenceGuids(truckSelection, TRUCK_SELECTION_ORDER_SEQUENCE_ASSOCIATIONS);
    if (sequenceGuids.length === 0) {
      return sequenceByOrderGuid;
    }

    const sequenceObjects = await loadMendixObjects(sequenceGuids);
    const orderGuidsBySequenceGuid = new Map<string, string[]>();
    let missingSequence = 0;

    for (const sequenceObj of sequenceObjects) {
      const sequenceGuid = getObjectGuid(sequenceObj);
      if (!sequenceGuid) {
        continue;
      }
      const orderGuids = getReferenceGuids(sequenceObj, ORDER_SEQUENCE_TRANSPORT_ORDER_ASSOCIATIONS);
      orderGuidsBySequenceGuid.set(sequenceGuid, orderGuids);

      const raw = toPlainObject(sequenceObj);
      const sequenceValue = Number(
        raw[TRANSPORT_ORDER_SEQUENCE_ATTRIBUTES.orderSequence] ??
          raw.orderSequence ??
          raw[TRANSPORT_ORDER_SEQUENCE_ATTRIBUTES.orderSequence.toLowerCase()]
      );
      if (!Number.isFinite(sequenceValue)) {
        // Keep the sequence's orders reachable but unordered; the caller sorts
        // missing sequences last, so a partially configured truck still loads.
        missingSequence += 1;
        continue;
      }
      for (const orderGuid of orderGuids) {
        const current = sequenceByOrderGuid.get(orderGuid);
        // A TransportOrder linked to several sequences keeps its lowest order.
        if (current === undefined || sequenceValue < current) {
          sequenceByOrderGuid.set(orderGuid, sequenceValue);
        }
      }
    }

    if (missingSequence > 0 && isMendixRuntime()) {
      console.warn(
        `loadOrderSequenceByOrderGuid: ${missingSequence}/${sequenceObjects.length} TransportOrderSequences have no numeric OrderSequence`
      );
    }
  } catch (err) {
    console.error("Failed to load TransportOrderSequence:", err);
  }

  return sequenceByOrderGuid;
};
