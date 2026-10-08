import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { LoadingCanvasView } from "./LoadingCanvasView";
import type { LoadingCanvasProps, LoadingCanvasViewModelProps } from "./LoadingCanvas.properties";
import {
  getObjectGuid,
  loadTruckAndScale,
  loadCargoItems,
  loadOrderSequenceByOrderGuid,
  loadPackingPlan,
  savePackingPlan,
  markTruckSelectionCompleteLoading,
} from "../../infrastructure/mendix/mendixDataAdapter";
import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import type { TruckItem } from "../../core/types/viewModels/TruckItem";
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from "../../core/constants/canvas";

/**
 * LoadingCanvasContainer — the Mendix widget container.
 *
 * This component sits between Mendix and the LoadingCanvas widget.
 * It is responsible for:
 * - Receiving raw Mendix object references (GUID strings)
 * - Resolving them to full objects via the Mendix Data API (mx.data)
 * - Converting them to view models using adapters
 * - Passing the view models and callbacks to the LoadingCanvas widget
 * - Handling save/load plan via Mendix microflows and the PackingPlan entity
 */
export const LoadingCanvasContainer = (props: LoadingCanvasProps): ReactElement => {
  const {
    truckSelection: truckSelectionRef,
    transportOrders: transportOrdersRef,
    canvasWidth = DEFAULT_CANVAS_WIDTH,
    canvasHeight = DEFAULT_CANVAS_HEIGHT,
    onSavePlan: onSavePlanCallback,
    onLoadPlan: onLoadPlanCallback,
  } = props;

  // Handle datasource from Mendix - extract first item
  const truckSelection = Array.isArray(truckSelectionRef) ? truckSelectionRef[0] : truckSelectionRef;
  const truckGuidKey = getObjectGuid(truckSelection) ?? "";
  const transportOrderGuids = transportOrdersRef ?? [];
  const transportOrdersKey = transportOrderGuids.join("|");

  // --- State for loaded data ---
  const [truckItem, setTruckItem] = useState<TruckItem | null>(null);
  const [availableCargo, setAvailableCargo] = useState<CargoItem[]>([]);
  const [initialCanvasItems, setInitialCanvasItems] = useState<CargoItem[]>([]);
  const [scale, setScale] = useState({ widthScale: 1, heightScale: 1 });
  const [truckGuid, setTruckGuid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Load truck data and compute scale ---
  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      if (!truckGuidKey) {
        if (!cancelled) {
          setTruckItem(null);
          setTruckGuid(null);
          setScale({ widthScale: 1, heightScale: 1 });
          setIsLoading(false);
        }
        return;
      }

      try {
        const result = await loadTruckAndScale(truckGuidKey);
        if (cancelled) return;
        setTruckItem(result.truck);
        setTruckGuid(result.truckGuid);
        setScale(result.scale);

        // PARALLEL: cargo + plan both depend only on truck/scale
        // PARALLEL: the loading sequence and the saved plan depend only on truck/scale;
        // cargo loading then consumes the resolved sequence (BR-24).
        const [sequenceByOrderGuid, plan] = await Promise.all([
          result.truckGuid
            ? loadOrderSequenceByOrderGuid(result.truckGuid)
            : Promise.resolve(new Map<string, number>()),
          result.truckGuid ? loadPackingPlan(result.truckGuid, result.scale, transportOrderGuids) : Promise.resolve([]),
        ]);
        const cargo =
          transportOrderGuids.length > 0
            ? await loadCargoItems(transportOrderGuids, result.scale, sequenceByOrderGuid)
            : [];
        if (cancelled) return;
        setAvailableCargo(cargo);
        setInitialCanvasItems(plan);
      } catch (err) {
        if (!cancelled) console.error("Failed to load data:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [truckGuidKey, transportOrdersKey]);

  // Scale is only non-unit once a TruckSelection loaded successfully, so it
  // doubles as the readiness signal for every scale-dependent load.
  const hasTruckDerivedScale = scale.widthScale !== 1 && scale.heightScale !== 1;

  // --- Save plan handler ---
  const [saveError, setSaveError] = useState<string | null>(null);
  const handleSavePlan = useCallback(
    async (items: CargoItem[], currentScale: { widthScale: number; heightScale: number }) => {
      if (!truckGuid) {
        // No silent no-op (16-§16.4): tell the user why Save did nothing.
        setSaveError("No truck selected — cannot save the packing plan.");
        return;
      }

      try {
        await savePackingPlan(truckGuid, { truck: truckItem, cargos: items }, currentScale, onSavePlanCallback);
        setSaveError(null);
      } catch (err) {
        // Keep the canvas state; surface the failure so the user is not left
        // with a silent "Save" that did nothing.
        setSaveError(err instanceof Error ? err.message : "Failed to save packing plan");
      }
      // Items stay in canvas state - no need to reload from DB
    },
    [truckGuid, truckItem, onSavePlanCallback]
  );

  // --- Verify-finalize chain (BR-47): only a successful Verify leads here ---
  const handleVerifyFinalize = useCallback(
    async (items: CargoItem[]): Promise<boolean> => {
      if (!truckGuid) {
        // No silent no-op (16-§16.4): tell the user why nothing was finalized.
        setSaveError("No truck selected — cannot finalize the load.");
        return false;
      }

      try {
        await savePackingPlan(truckGuid, { truck: truckItem, cargos: items }, scale, onSavePlanCallback);
        await markTruckSelectionCompleteLoading(truckGuid);
        setSaveError(null);
        return true;
      } catch (err) {
        // Surface the failing step; the flag is never set on a failed chain.
        setSaveError(err instanceof Error ? err.message : "Failed to finalize the load");
        return false;
      }
    },
    [truckGuid, truckItem, scale, onSavePlanCallback]
  );

  // --- Load plan handler ---
  const handleLoadPlan = useCallback(async () => {
    if (!truckGuid || !hasTruckDerivedScale) {
      return;
    }

    try {
      const savedItems = await loadPackingPlan(truckGuid, scale, transportOrderGuids);
      // Only replace canvas content when a plan exists; otherwise keep the
      // user's unsaved work instead of silently clearing the canvas.
      if (savedItems.length > 0) {
        setInitialCanvasItems(savedItems);
      }
      onLoadPlanCallback?.();
    } catch (err) {
      console.error("Failed to load packing plan:", err);
      return;
    }
  }, [truckGuid, scale, transportOrdersKey, onLoadPlanCallback]);

  // --- Build view model props ---
  const viewModel: LoadingCanvasViewModelProps = useMemo(
    () => ({
      truck: truckItem,
      availableCargo,
      initialCanvasItems,
      scale,
      canvasWidth,
      canvasHeight,
      saveError,
      onSavePlan: handleSavePlan,
      onLoadPlan: handleLoadPlan,
      onVerifyFinalize: handleVerifyFinalize,
      isLoading,
    }),
    [
      truckItem,
      availableCargo,
      initialCanvasItems,
      scale,
      canvasWidth,
      canvasHeight,
      saveError,
      handleSavePlan,
      handleLoadPlan,
      handleVerifyFinalize,
      isLoading,
    ]
  );

  return <LoadingCanvasView viewModel={viewModel} isLoading={isLoading} />;
};

export default LoadingCanvasContainer;
