import { getMx, isMendixRuntime, isMxObject, setMxAttribute } from "../mendix/mendixRuntime";
import { loadMendixObject } from "../mendix/mendixLoaders";
import { TRUCK_SELECTION_COMPLETE_LOADING_ATTRIBUTE } from "../mendix/mendixSchema";

// Marks the TruckSelection as completely loaded (BR-47). Called only by the
// Verify-finalize chain after the packing plan has been persisted, so the
// boolean never marks an arrangement that was not saved.
export const markTruckSelectionCompleteLoading = async (truckGuid: string): Promise<void> => {
  if (!isMendixRuntime()) {
    // Dev fallback: no runtime to write to (mirrors savePackingPlan's dev path).
    return;
  }

  const truckSelection = await loadMendixObject(truckGuid);
  if (!truckSelection || !isMxObject(truckSelection)) {
    throw new Error(`CompleteLoading: TruckSelection ${truckGuid} could not be loaded for the flag write`);
  }

  setMxAttribute(truckSelection, TRUCK_SELECTION_COMPLETE_LOADING_ATTRIBUTE, true, "TruckSelection");

  const mxData = getMx()!;
  await new Promise<void>((resolve, reject) => {
    mxData.commit({
      mxobjs: [truckSelection],
      callback: () => resolve(),
      error: (err: Error) => reject(err),
      // Server-side validation feedback must not be swallowed (06-§6.6).
      onValidation: (validations: unknown[]) =>
        reject(new Error(`CompleteLoading write rejected server validation: ${JSON.stringify(validations)}`)),
    });
  });
};
