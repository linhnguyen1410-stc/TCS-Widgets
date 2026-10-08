import { useEffect, useState, type FC } from "react";
import { autoLoadCargoUnits, packCargoIntoBounds } from "../../domain/packing/packingRules";
import { getExpectedUnitCount, isLoadingComplete, validateAll } from "../../domain/rules/validationRules";
import { getTruckBoundsFromItem, getTruckFrontDataX } from "../../domain/rules/boundaryRules";
import type { AxisScale } from "../../domain/rules/rotationRules";
import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import type { TruckItem } from "../../core/types/viewModels/TruckItem";
import { placedInstancesOf } from "../../core/utils/cargoId";
import {
  INFO_PANEL_TOP,
  INFO_PANEL_RIGHT,
  INFO_PANEL_Z_INDEX,
  INFO_PANEL_PADDING,
  INFO_PANEL_BACKGROUND,
  INFO_PANEL_BORDER,
} from "../../core/constants/canvas";
import { ERROR_TEXT_COLOR, SAVE_ERROR_COLOR } from "../../core/constants/theme";

interface CanvasToolbarProps {
  items: CargoItem[];
  availableCargo: CargoItem[];
  availableCargoItems: CargoItem[];
  truck: TruckItem | null;
  scale: AxisScale;
  canvasWidth: number;
  canvasHeight: number;
  setItems: (items: CargoItem[]) => void;
  onSavePlan: () => void;
  onLoadPlan: () => void;
  saveError?: string | null;
  isLoading: boolean;
  // Verify-finalize chain (BR-47): called with the canvas items only after a
  // successful Verify; resolves true when the plan is saved and CompleteLoading is set.
  onFinalizeLoad?: (items: CargoItem[]) => Promise<boolean>;
}

// Toolbar/info panel overlay (extracted per DEBT D-1, template 13-§13.2).
// Owns the Auto Load repack (BR-26 packing), the Verify check (BR-40/BR-41/BR-45),
// and their status messages (BR-43).
export const CanvasToolbar: FC<CanvasToolbarProps> = ({
  items,
  availableCargo,
  availableCargoItems,
  truck,
  scale,
  canvasWidth,
  canvasHeight,
  setItems,
  onSavePlan,
  onLoadPlan,
  saveError,
  isLoading,
  onFinalizeLoad,
}) => {
  // --- Auto Load: repack every cargo (on canvas + still in list) into the truck ---
  const [autoLoadUnplaced, setAutoLoadUnplaced] = useState(0);
  const handleAutoLoad = (): void => {
    // Guard: don't run if loading or no truck
    if (isLoading || !truck) return;

    const bounds = truck ?? { x: 0, y: 0, length: canvasWidth, width: canvasHeight };

    const expandedItems = autoLoadCargoUnits(items, availableCargoItems, placedInstancesOf(items));
    const { placed, unplaced } = packCargoIntoBounds(expandedItems, bounds, scale);

    setItems(placed);
    setAutoLoadUnplaced(unplaced.length);
  }; // --- Verify: every cargo placed AND the layout is geometrically valid (BR-40/BR-45) ---
  // Expected count = total packing units across all TransportOrders (SUM quantity),
  // so verification passes only when the cargo list has been emptied onto the canvas.
  // Verification additionally re-runs the placement validation (overlap / out of
  // bounds / load meters), so a fully-placed but invalid layout still fails (BR-45).
  interface VerifyResult {
    placed: number;
    expected: number;
    loadComplete: boolean; // BR-40: every unit placed and the available list is empty
    layoutValid: boolean; // BR-45: cargos are valid inside the truck
    layoutErrors: readonly string[];
    complete: boolean; // loadComplete && layoutValid
  }
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeCompleted, setFinalizeCompleted] = useState(false);
  const handleVerify = async (): Promise<void> => {
    if (isFinalizing || !truck) {
      return;
    }
    const bounds = getTruckBoundsFromItem(truck);
    const truckFrontDataX = getTruckFrontDataX(truck);
    const layout = validateAll(items, bounds, { maxLoadMeters: truck?.maxLoadMeters, scale, truckFrontDataX });
    const loadComplete = isLoadingComplete(availableCargo, items.length, availableCargoItems.length);
    // validateAll aggregates one error per affected item, so several overlapping cargos
    // produce repeated OVERLAP entries; dedupe for the human-readable message. Per-item
    // detail stays available via layout.itemErrors.
    const result: VerifyResult = {
      placed: items.length,
      expected: getExpectedUnitCount(availableCargo),
      loadComplete,
      layoutValid: layout.valid,
      layoutErrors: Array.from(new Set(layout.errors)),
      complete: loadComplete && layout.valid,
    };
    setVerifyResult(result);
    setFinalizeCompleted(false);

    // Verify-finalize chain (BR-47): only a successful Verify may persist the
    // plan and set CompleteLoading on the TruckSelection.
    if (!result.complete || !onFinalizeLoad) {
      return;
    }
    setIsFinalizing(true);
    try {
      const finalized = await onFinalizeLoad(items);
      setFinalizeCompleted(finalized);
    } finally {
      setIsFinalizing(false);
    }
  };

  // A changed item count invalidates the previous verification and completion
  // result (BR-41).
  useEffect(() => {
    setVerifyResult(null);
    setFinalizeCompleted(false);
  }, [items.length]);

  return (
    <div
      style={{
        position: "absolute",
        top: INFO_PANEL_TOP,
        right: INFO_PANEL_RIGHT,
        zIndex: INFO_PANEL_Z_INDEX,
        background: INFO_PANEL_BACKGROUND,
        padding: INFO_PANEL_PADDING,
        border: INFO_PANEL_BORDER,
      }}>
      <div style={{ marginTop: 4 }}>
        <button onClick={onSavePlan} style={{ marginRight: 8 }} disabled={isFinalizing}>
          Save Plan
        </button>
        <button onClick={onLoadPlan} style={{ marginRight: 8 }} disabled={isFinalizing}>
          Load Plan
        </button>
        <button
          onClick={handleAutoLoad}
          style={{ marginRight: 8 }}
          disabled={(items.length === 0 && availableCargoItems.length === 0) || isLoading || isFinalizing || !truck}>
          Auto Load
        </button>
        <button
          onClick={handleVerify}
          disabled={availableCargo.length === 0 || isLoading || isFinalizing || !truck}
          style={
            verifyResult
              ? {
                  backgroundColor: verifyResult.complete ? "green" : "red",
                  color: "#fff",
                }
              : undefined
          }>
          Verify
        </button>
      </div>
      {autoLoadUnplaced > 0 && (
        <div style={{ color: ERROR_TEXT_COLOR, fontSize: 12 }}>{autoLoadUnplaced} item(s) did not fit</div>
      )}
      {verifyResult && !verifyResult.complete && (
        <div style={{ color: ERROR_TEXT_COLOR, fontSize: 12, maxWidth: 260 }}>
          {!verifyResult.loadComplete && (
            <div>{`Remaining ${verifyResult.expected - verifyResult.placed} unit(s) not placed`}</div>
          )}
          {!verifyResult.layoutValid && (
            <div>
              Placement invalid:{" "}
              {verifyResult.layoutErrors.length > 0
                ? verifyResult.layoutErrors.join(", ")
                : "overlap / out of bounds / load meters"}
            </div>
          )}
        </div>
      )}
      {saveError && (
        <div style={{ color: SAVE_ERROR_COLOR, fontSize: 12, maxWidth: 260 }} title={saveError}>
          Save failed: {saveError}
        </div>
      )}
      {finalizeCompleted && (
        <div style={{ color: "green", fontSize: 12, maxWidth: 260 }}>
          Loading completed — plan saved and truck marked as fully loaded.
        </div>
      )}
    </div>
  );
};
