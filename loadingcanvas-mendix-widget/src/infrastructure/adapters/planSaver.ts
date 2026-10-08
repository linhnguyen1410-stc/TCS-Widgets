import { serializePlan, type PackingPlanData, type PackingPlanState } from "./stateAdapter";
import { getMx, isMendixRuntime, isMxObject, setMxAttribute, setMxDecimalAttribute } from "../mendix/mendixRuntime";
import { toPlainObject } from "../mendix/mendixMappers";
import { fromCargoId } from "../../core/utils/cargoId";
import { findPackingPlan, findPackingPlanItems } from "./planLoader";
import {
  PACKING_PLAN_ATTRIBUTES,
  PACKING_PLAN_ENTITY,
  PACKING_PLAN_ITEM_ATTRIBUTES,
  PACKING_PLAN_ITEM_ENTITY,
  PACKING_PLAN_ITEM_PACKING_PLAN_ASSOCIATION,
  PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION,
  PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION,
  PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION_FALLBACK,
} from "../mendix/mendixSchema";

// CreatedDate/ModifiedDate are required on PackingPlan (docs/MENDIX_ENTITY.md) but
// were never written by the save flow; set them on create and touch ModifiedDate
// on every save. Dev fixtures are plain objects, so guard before calling set.
const setDateAttribute = (obj: unknown, attr: string, value: Date, ctx: string): void => {
  if (isMxObject(obj)) {
    setMxAttribute(obj, attr, value, ctx);
  } else if (obj && typeof obj === "object") {
    (obj as Record<string, unknown>)[attr] = value;
  }
};

export const savePackingPlan = async (
  truckGuid: string | null,
  state: PackingPlanState,
  scale: { widthScale: number; heightScale: number },
  onSaveMicroflow?: () => void
): Promise<PackingPlanData> => {
  const plan = serializePlan(state, scale);

  if (!isMendixRuntime()) {
    onSaveMicroflow?.();
    return plan;
  }

  try {
    const plans = truckGuid ? await findPackingPlan(truckGuid) : [];

    let planGuid: string | null = null;
    const mxData = getMx()!;
    const now = new Date();
    let planToCommit: unknown = null;

    if (plans.length > 0) {
      const planPlain = toPlainObject(plans[0]);
      planGuid = (planPlain.id ?? planPlain.guid) as string;
      planToCommit = plans[0];
      setDateAttribute(plans[0], PACKING_PLAN_ATTRIBUTES.modifiedDate, now, "PackingPlan");

      const existingItems = await findPackingPlanItems(planGuid);
      const itemGuids = existingItems
        .map((item) => {
          const p = toPlainObject(item);
          return (p.id ?? p.guid) as string;
        })
        .filter(Boolean);

      if (itemGuids.length > 0) {
        await new Promise<void>((resolve, reject) => {
          mxData.remove({
            guids: itemGuids,
            callback: () => resolve(),
            error: (err: Error) => reject(err),
          });
        });
      }
    } else {
      const newPlanObj = await new Promise<unknown>((resolve, reject) => {
        mxData.create({
          entity: PACKING_PLAN_ENTITY,
          callback: (obj: unknown) => {
            try {
              if (truckGuid) {
                try {
                  setMxAttribute(obj, PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION, truckGuid, "PackingPlan");
                } catch (firstError) {
                  try {
                    setMxAttribute(obj, PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION_FALLBACK, truckGuid, "PackingPlan");
                  } catch (secondError) {
                    throw new Error("PackingPlan: unable to set TruckSelection association", {
                      cause: secondError,
                    });
                  }
                  console.warn("PackingPlan: used association fallback", firstError);
                }
              }
              resolve(obj);
            } catch (error) {
              reject(error);
            }
          },
          error: (err: Error) => reject(err),
        });
      });
      const planPlain = toPlainObject(newPlanObj);
      planGuid = (planPlain.id ?? planPlain.guid) as string;
      planToCommit = newPlanObj;
      setDateAttribute(newPlanObj, PACKING_PLAN_ATTRIBUTES.createdDate, now, "PackingPlan");
      setDateAttribute(newPlanObj, PACKING_PLAN_ATTRIBUTES.modifiedDate, now, "PackingPlan");
    }

    const createdItems: unknown[] = [];
    for (const item of plan.items) {
      await new Promise<void>((resolve, reject) => {
        mxData.create({
          entity: PACKING_PLAN_ITEM_ENTITY,
          callback: (itemObj: unknown) => {
            try {
              const orderId = fromCargoId(item.id);
              setMxAttribute(
                itemObj,
                PACKING_PLAN_ITEM_PACKING_PLAN_ASSOCIATION,
                planGuid,
                `PackingPlanItem ${item.id}`
              );

              // Set TransportOrder association following the same pattern as PackingPlanItem_PackingPlan.
              // Use the module-prefixed Domain Model name.
              setMxAttribute(
                itemObj,
                PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION,
                orderId,
                `PackingPlanItem ${item.id}`
              );
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.positionX,
                item.x,
                `PackingPlanItem ${item.id}`
              );
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.positionY,
                item.y,
                `PackingPlanItem ${item.id}`
              );
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.length,
                item.length,
                `PackingPlanItem ${item.id}`
              );
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.width,
                item.width,
                `PackingPlanItem ${item.id}`
              );
              // Height is a required column; the 2D canvas has no Z value so store 0.
              setMxDecimalAttribute(itemObj, PACKING_PLAN_ITEM_ATTRIBUTES.height, 0, `PackingPlanItem ${item.id}`);
              setMxAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.rotation,
                item.rotation,
                `PackingPlanItem ${item.id}`
              );
              setMxAttribute(itemObj, PACKING_PLAN_ITEM_ATTRIBUTES.color, item.color, `PackingPlanItem ${item.id}`);
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.lengthMeters,
                item.lengthM ?? 0,
                `PackingPlanItem ${item.id}`
              );
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.widthMeters,
                item.widthM ?? 0,
                `PackingPlanItem ${item.id}`
              );
              setMxDecimalAttribute(
                itemObj,
                PACKING_PLAN_ITEM_ATTRIBUTES.weightKg,
                item.weightKg ?? 0,
                `PackingPlanItem ${item.id}`
              );
              createdItems.push(itemObj);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          error: (err: Error) => reject(err),
        });
      });
    }

    const commitObjs: unknown[] = planToCommit ? [planToCommit] : [];
    commitObjs.push(...createdItems);
    if (commitObjs.length > 0) {
      await new Promise<void>((resolve, reject) => {
        mxData.commit({
          mxobjs: commitObjs,
          callback: () => resolve(),
          error: (err: Error) => reject(err),
          // Server-side validation feedback must not be swallowed (06-§6.6).
          onValidation: (validations: unknown[]) =>
            reject(new Error(`PackingPlan save rejected server validation: ${JSON.stringify(validations)}`)),
        });
      });
    }
  } catch (err) {
    console.error("Failed to save PackingPlan:", err);
    throw err;
  }

  onSaveMicroflow?.();

  return plan;
};
