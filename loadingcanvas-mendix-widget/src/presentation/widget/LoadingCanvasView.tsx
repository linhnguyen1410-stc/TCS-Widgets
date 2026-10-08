import { useCallback, useMemo, useRef, useState, type ReactElement, type RefObject } from "react";
import { CanvasToolbar } from "../components/CanvasToolbar";
import { CargoCard } from "../components/CargoCard";
import { CargoList } from "../components/CargoList";
import { GridOverlay } from "../components/GridOverlay";
import { getClickAddDataPoint } from "../hooks/coordinateRule";
import { useTruckCanvas } from "../hooks/useTruckCanvas";
import { getRotatedScreenSize } from "../../domain/rules/rotationRules";
import { CANVAS_BORDER, DEFAULT_MARGIN, GRID_SIZE, TRUCK_FRAME_BORDER } from "../../core/constants/canvas";
import { CANVAS_BACKGROUND_COLOR, EMPTY_STATE_COLOR, EMPTY_STATE_FONT_SIZE } from "../../core/constants/theme";
import { CARD_ACTIVE_Z_INDEX, CARD_DEFAULT_Z_INDEX } from "../../core/constants/card";
import { CARGO_LIST_CHIP_COLOR, CARGO_LIST_CHIP_FONT_WEIGHT } from "../../core/constants/cargoList";
import { fromCargoId, getCargoInstanceIndex, placedInstancesOf } from "../../core/utils/cargoId";
import truckBackground from "../assets/Truck_horizontal.png";
import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import type { LoadingCanvasViewProps } from "./LoadingCanvas.properties";

/**
 * LoadingCanvasView — pure React canvas renderer.
 *
 * This component receives view models from the LoadingCanvasContainer
 * (which resolves Mendix object references via mx.data) and renders the
 * interactive packing canvas. It is not the Mendix build entry point;
 * that role belongs to src/LoadingCanvas.tsx.
 *
 * Key responsibilities:
 * - Render the canvas with truck boundary, cargo items, and info panel
 * - Manage drag-and-drop from the cargo list onto the canvas
 * - Handle rotation, grid snapping, and real-time validation
 * - Display validation status (colors, errors)
 * - Expose save/load callbacks to the container
 */
export const LoadingCanvasView = (props: LoadingCanvasViewProps): ReactElement => {
  const { viewModel, isLoading } = props;
  const {
    truck,
    availableCargo,
    initialCanvasItems,
    scale,
    canvasWidth,
    canvasHeight,
    saveError,
    onSavePlan,
    onLoadPlan,
    onVerifyFinalize,
  } = viewModel;

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const listPanelRef = useRef<HTMLDivElement | null>(null);

  // --- Truck backdrop: fixed for ALL trucks (original behavior). The image is
  // drawn at 100% canvas width (1800px, natural height ~383px) and pinned to
  // the canvas top (center top), so every truck shows the identical drawing at
  // the same spot; only the frame and cargo vary per truck (frames center on
  // TRUCK_DRAWING_MIDLINE_Y, see truckAdapter). sceneOffset stays {0,0}: data
  // coordinates render 1:1 (drop/click conversion plumbing is retained).
  const truckBackdrop = useMemo(
    () => ({
      backgroundSize: "100% auto" as const,
      backgroundPosition: "center top" as const,
      sceneOffset: { x: 0, y: 0 },
    }),
    []
  );

  const handleItemRemoved = useCallback((_itemId: string) => {
    // The hook calls controller.removeItem internally; we just notify the list
    // No additional action needed here as controller.removeItem already handles state
  }, []);

  // --- Canvas state from the hook ---
  const {
    items,
    activeItemId,
    selectedIds,
    validation,
    handleCanvasMouseDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleRotate,
    addItem,
    setItems,
    onPointerDragStart,
    shouldSuppressClick,
    dragPreview,
  } = useTruckCanvas({
    initialItems: initialCanvasItems,
    canvasWidth,
    canvasHeight,
    canvasRef: canvasRef as RefObject<HTMLDivElement | null>,
    scale,
    truck,
    sceneOffset: truckBackdrop.sceneOffset,
    listPanelRef,
    // Called when an item is dropped on the list panel (canvas->list return)
    onItemRemoved: handleItemRemoved,
  });

  // Exact instance indices already on canvas per transport order (Map<baseId, Set<index>>).
  // Using the SSOT distribution helper (16-§16.2-a); placedInstancesOf is reused by the
  // pallet list, Verify, Auto Load, plan load and save so the counts never diverge.
  const placedInstances = useMemo(() => placedInstancesOf(items), [items]);

  // Cumulative numbering offset per transport order, computed once from the full
  // availableCargo list so numbers never shift when a previous order is fully placed.
  const numberStart = useMemo(() => {
    const start = new Map<string, number>();
    let offset = 0;
    for (const cargo of availableCargo) {
      start.set(fromCargoId(cargo.id), offset);
      offset += cargo.quantity ?? 1;
    }
    return start;
  }, [availableCargo]);

  // Available cargo = availableCargo minus those fully placed on canvas.
  const availableCargoItems = useMemo(() => {
    return availableCargo.filter((p) => {
      const baseId = fromCargoId(p.id);
      return (placedInstances.get(baseId)?.size ?? 0) < (p.quantity ?? 1);
    });
  }, [availableCargo, placedInstances]);

  // --- Save plan handler ---
  const handleSavePlan = (): void => {
    onSavePlan(items, scale);
  };

  // --- Load plan handler ---
  const handleLoadPlan = (): void => {
    onLoadPlan();
  };

  // Only one cargo info popup is open at a time; double-clicking another card
  // moves the popup to it, double-clicking the same card closes it.
  const [popupItemId, setPopupItemId] = useState<string | null>(null);
  const handleTogglePopup = (itemId: string): void => {
    setPopupItemId((current) => (current === itemId ? null : itemId));
  };

  // --- Get item-specific errors for status display ---
  const getItemErrors = (itemId: string): string[] => {
    return validation?.itemErrors?.[itemId] ?? [];
  };

  // Ghost preview for list->canvas drag: compute rotated footprint and instance
  // number once so the preview matches the settled card exactly (same size,
  // same numbering scheme). Only rendered when `dragPreview` is non-null.
  const dragPreviewSize = useMemo(
    () =>
      dragPreview
        ? getRotatedScreenSize(
            { length: dragPreview.cargo.length, width: dragPreview.cargo.width },
            dragPreview.cargo.rotation,
            scale
          )
        : null,
    [dragPreview, scale]
  );
  const dragPreviewNumber = dragPreview
    ? (numberStart.get(fromCargoId(dragPreview.cargo.id)) ?? 0) + getCargoInstanceIndex(dragPreview.cargo.id) + 1
    : 0;

  // --- Loading state ---
  if (isLoading) {
    return (
      <div
        style={{
          position: "relative",
          width: canvasWidth,
          height: canvasHeight,
          margin: DEFAULT_MARGIN,
          overflow: "hidden",
          border: CANVAS_BORDER,
          backgroundColor: CANVAS_BACKGROUND_COLOR,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: EMPTY_STATE_FONT_SIZE,
          color: EMPTY_STATE_COLOR,
        }}>
        Loading...
      </div>
    );
  }

  // --- Render ---
  return (
    <div
      ref={canvasRef}
      onMouseDown={handleCanvasMouseDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        position: "relative",
        width: canvasWidth,
        height: canvasHeight,
        margin: DEFAULT_MARGIN,
        overflow: "hidden",
        border: CANVAS_BORDER,
        backgroundColor: CANVAS_BACKGROUND_COLOR,
        backgroundImage: `url(${truckBackground})`,
        backgroundSize: truckBackdrop.backgroundSize,
        backgroundPosition: truckBackdrop.backgroundPosition,
        backgroundRepeat: "no-repeat",
      }}>
      {/* Grid overlay */}
      <GridOverlay width={canvasWidth} height={canvasHeight} gridSize={GRID_SIZE} />

      {/* Truck boundary + cargo shift with the backdrop image (visual only) */}
      <div style={{ transform: `translate(${truckBackdrop.sceneOffset.x}px, ${truckBackdrop.sceneOffset.y}px)` }}>
        {/* Truck boundary (loading area) */}
        {truck && (
          <div
            style={{
              position: "absolute",
              left: truck.x,
              top: truck.y,
              width: truck.length,
              height: truck.width,
              border: TRUCK_FRAME_BORDER,
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Info panel overlay */}
      <CanvasToolbar
        items={items}
        availableCargo={availableCargo}
        availableCargoItems={availableCargoItems}
        truck={truck}
        scale={scale}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        setItems={setItems}
        onSavePlan={handleSavePlan}
        onLoadPlan={handleLoadPlan}
        onFinalizeLoad={onVerifyFinalize}
        saveError={saveError}
        isLoading={isLoading}
      />

      {/* Cargo list (debug view) */}
      <CargoList
        availableItems={availableCargoItems}
        placedInstances={placedInstances}
        numberStart={numberStart}
        onAddCargo={(cargo: CargoItem) => {
          const p = getClickAddDataPoint(truck, truckBackdrop.sceneOffset);
          addItem({
            ...cargo,
            x: p.x,
            y: p.y,
          });
        }}
        onRemoveCargo={handleItemRemoved}
        canvasRef={canvasRef}
        panelRef={listPanelRef}
        onPointerDragStart={onPointerDragStart}
        shouldSuppressClick={shouldSuppressClick}
      />

      {/* Cargo cards on canvas — same visual shift as the truck frame */}
      <div style={{ transform: `translate(${truckBackdrop.sceneOffset.x}px, ${truckBackdrop.sceneOffset.y}px)` }}>
        {items.map((item) => (
          <CargoCard
            key={item.id}
            item={item}
            number={(numberStart.get(fromCargoId(item.id)) ?? 0) + getCargoInstanceIndex(item.id) + 1}
            isActive={activeItemId === item.id}
            selectedIds={selectedIds}
            hasError={getItemErrors(item.id).length > 0}
            scale={scale}
            onPointerDown={(e) => handlePointerDown(e, item.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onRotate={handleRotate}
            isPopupOpen={popupItemId === item.id}
            onTogglePopup={() => handleTogglePopup(item.id)}
            canvasWidth={canvasWidth}
          />
        ))}
        {/* Held (not yet placed) unit — mirrors CargoCard visuals, dashed = held */}
        {dragPreview && dragPreviewSize && (
          <div
            style={{
              position: "absolute",
              left: dragPreview.x,
              top: dragPreview.y,
              width: dragPreviewSize.length,
              height: dragPreviewSize.width,
              backgroundColor: dragPreview.cargo.color,
              border: "2px dashed #fff",
              boxSizing: "border-box",
              zIndex: CARD_ACTIVE_Z_INDEX,
              pointerEvents: "none",
              opacity: 0.85,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <span
              style={{
                fontSize: Math.min(28, Math.min(dragPreviewSize.length, dragPreviewSize.width) * 0.3),
                color: CARGO_LIST_CHIP_COLOR,
                fontWeight: CARGO_LIST_CHIP_FONT_WEIGHT,
                lineHeight: 1,
              }}>
              {dragPreviewNumber}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingCanvasView;
