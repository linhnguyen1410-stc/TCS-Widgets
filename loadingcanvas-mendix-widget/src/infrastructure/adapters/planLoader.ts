import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import { deserializePlan, type PackingPlanData } from "./stateAdapter";
import { getObjectGuid, isMendixRuntime, isMxObject } from "../mendix/mendixRuntime";
import { loadMendixList, loadMendixObjects } from "../mendix/mendixLoaders";
import { filterByAssociationGuid } from "../mendix/mendixAssociations";
import { toPlainObject } from "../mendix/mendixMappers";
import { buildTransportOrderMeta, type TransportOrderMeta } from "./transportOrderMeta";
import { DEFAULT_LENGTH_METER, DEFAULT_WIDTH_METER, packingTypeFromColor } from "./cargoAdapter";
import { fromCargoId, makeInstanceId, toCargoId } from "../../core/utils/cargoId";
import {
  PACKING_PLAN_ITEM_ASSOCIATIONS,
  PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION,
  PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION_FALLBACK,
  PACKING_PLAN_ITEM_XPATH,
  PACKING_PLAN_TRUCK_ASSOCIATIONS,
  PACKING_PLAN_XPATH,
} from "../mendix/mendixSchema";

export const findPackingPlan = async (truckGuid: string): Promise<unknown[]> => {
  const plans = await loadMendixList(PACKING_PLAN_XPATH);
  return filterByAssociationGuid(plans, PACKING_PLAN_TRUCK_ASSOCIATIONS, truckGuid);
};

export const findPackingPlanItems = async (planGuid: string): Promise<unknown[]> => {
  const items = await loadMendixList(PACKING_PLAN_ITEM_XPATH);
  return filterByAssociationGuid(items, PACKING_PLAN_ITEM_ASSOCIATIONS, planGuid);
};

export const loadPackingPlan = async (
  truckGuid: string | null,
  scale: { widthScale: number; heightScale: number },
  // The truck's CURRENT TransportOrder set at load time. When provided, saved items
  // whose order was removed from the TruckSelection since the plan was saved are not
  // restored (they keep rendering on reopen even though they left the cargo list).
  // When omitted the loader behaves exactly as before (no filtering).
  validTransportOrderGuids?: readonly string[]
): Promise<CargoItem[]> => {
  if (!truckGuid) {
    return [];
  }

  try {
    const plans = await findPackingPlan(truckGuid);

    if (plans.length === 0) {
      return [];
    }

    const planPlain = toPlainObject(plans[0]);
    const planGuid = (planPlain.id ?? planPlain.guid) as string;
    if (!planGuid) {
      return [];
    }

    const planItems = await findPackingPlanItems(planGuid);

    // First pass: resolve the TransportOrder association per item so the meta
    // (TransportOrderNo / Product Name for the tooltip) can be batch-loaded.
    const resolvedItems = planItems.map((item) => {
      const raw = toPlainObject(item);
      // Association not in getAttributes(); read by mxObject.get()
      let transportOrderId: string | null = null;
      if (isMxObject(item)) {
        try {
          transportOrderId =
            getObjectGuid(item.get(PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION)) ??
            getObjectGuid(item.get(PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION_FALLBACK)) ??
            null;
        } catch {
          transportOrderId = null;
        }
      }
      // Plain-object fixtures may carry the association as a field.
      if (!transportOrderId && raw.TransportOrder != null) {
        transportOrderId = String(raw.TransportOrder);
      }
      if (!transportOrderId && raw.transportOrder != null) {
        transportOrderId = String(raw.transportOrder);
      }
      const rawItemId = String(raw.id ?? raw.guid ?? "item");
      if (!transportOrderId && isMendixRuntime()) {
        // Without the association the item key would be a PackingPlanItem GUID,
        // which silently mismatches TransportOrder-keyed cargo lists.
        console.warn(
          `loadPackingPlan: PackingPlanItem ${rawItemId} has no readable TransportOrder association (tried ${PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION}); falling back to "${rawItemId}"`
        );
      }
      return { raw, transportOrderId };
    });

    // When the caller supplies the truck's current TransportOrder set, drop any saved
    // item whose order is no longer in the TruckSelection. Comparison is on the
    // pre-prefix order GUID (toCargoId strips the "cargo-" prefix, matching loaded
    // cargo ids); items with an unresolvable association are dropped too because we
    // cannot confirm they belong to a valid order.
    let activeItems = resolvedItems;
    if (validTransportOrderGuids) {
      const activeOrders = new Set(validTransportOrderGuids.map((g) => toCargoId(String(g))));
      activeItems = resolvedItems.filter(
        ({ transportOrderId }) => !!transportOrderId && activeOrders.has(toCargoId(transportOrderId))
      );
    }

    // Load TransportOrderNo + Product/Company names for every resolved TransportOrder.
    const metaByOrderGuid = new Map<string, TransportOrderMeta>();
    const resolvedOrderGuids = [...new Set(activeItems.map((r) => r.transportOrderId).filter((g): g is string => !!g))];
    if (resolvedOrderGuids.length > 0) {
      try {
        const rawOrders = await loadMendixObjects(resolvedOrderGuids);
        for (const [guid, meta] of await buildTransportOrderMeta(rawOrders)) {
          metaByOrderGuid.set(guid, meta);
        }
      } catch (err) {
        // Meta only feeds the tooltip; a failed load must not break plan restore.
        console.warn("loadPackingPlan: failed to load TransportOrder meta for tooltips", err);
      }
    }

    const orderInstanceCount = new Map<string, number>();
    const planData: PackingPlanData = {
      truckId: truckGuid,
      items: activeItems.map(({ raw, transportOrderId }) => {
        const resolvedOrderId = transportOrderId ?? String(raw.id ?? raw.guid ?? "item");
        const baseItemId = toCargoId(resolvedOrderId);
        // The persisted TransportOrder association only stores the order GUID; when the
        // same order supplies several saved instances (quantity > 1) every restored id
        // must be unique or React would collapse the duplicates into one canvas card.
        // Canonical suffixing via makeInstanceId keeps loaded ids identical to the ids
        // the canvas generates when items are added/dropped (BUGLOG B-0005 fix).
        const occurrence = orderInstanceCount.get(baseItemId) ?? 0;
        orderInstanceCount.set(baseItemId, occurrence + 1);
        const itemId = makeInstanceId(baseItemId, occurrence);
        // PackingPlanItem has no Name/Type attributes (docs/MENDIX_ENTITY.md); type derives from Color.
        const colorValue =
          raw.Color !== undefined || raw.color !== undefined ? String(raw.Color ?? raw.color) : undefined;
        const itemType = packingTypeFromColor(colorValue);
        return {
          id: itemId,
          name: String(raw.Name ?? raw.name ?? `Cargo ${itemId}`),
          type: itemType,
          x: Number(raw.PositionX ?? raw.positionX ?? raw.x ?? 0),
          y: Number(raw.PositionY ?? raw.positionY ?? raw.y ?? 0),
          length: Number(raw.Length ?? raw.length ?? DEFAULT_LENGTH_METER),
          width: Number(raw.Width ?? raw.width ?? DEFAULT_WIDTH_METER),
          rotation: Number(raw.Rotation ?? raw.rotation ?? 0) as 0 | 90 | 180 | 270,
          color: colorValue ?? (itemType === "box" ? "blue" : "orange"),
          lengthM:
            raw.LengthMeters !== undefined || raw.lengthMeters !== undefined || raw.lengthM !== undefined
              ? Number(raw.LengthMeters ?? raw.lengthMeters ?? raw.lengthM)
              : undefined,
          widthM:
            raw.WidthMeters !== undefined || raw.widthMeters !== undefined || raw.widthM !== undefined
              ? Number(raw.WidthMeters ?? raw.widthMeters ?? raw.widthM)
              : undefined,
          weightKg:
            raw.WeightKg !== undefined || raw.weightKg !== undefined ? Number(raw.WeightKg ?? raw.weightKg) : undefined,
        };
      }),
    };

    const restoredItems = deserializePlan(planData, scale);

    // Attach tooltip/popup meta (TransportOrderNo / Product / Company names) to the restored items.
    return restoredItems.map((item) => {
      const meta = metaForItem(item.id, activeItems, metaByOrderGuid);
      return meta ? { ...item, ...meta } : item;
    });
  } catch (err) {
    console.error("Failed to load PackingPlan:", err);
    return [];
  }
};

// Maps a restored cargo item back to its TransportOrder meta via the resolved
// association GUID recorded during the first pass (item id keeps the "cargo-"
// prefix and may carry an instance suffix, so match through fromCargoId).
const metaForItem = (
  itemId: string,
  resolvedItems: { raw: Record<string, unknown>; transportOrderId: string | null }[],
  metaByOrderGuid: Map<string, TransportOrderMeta>
): TransportOrderMeta | undefined => {
  const baseId = fromCargoId(itemId);
  const match = resolvedItems.find((r) => {
    const resolvedOrderId = r.transportOrderId ?? String(r.raw.id ?? r.raw.guid ?? "item");
    return toCargoId(resolvedOrderId) === baseId || resolvedOrderId === baseId;
  });
  if (!match?.transportOrderId) {
    return undefined;
  }
  return metaByOrderGuid.get(match.transportOrderId);
};
