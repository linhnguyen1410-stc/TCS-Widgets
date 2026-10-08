import React, { useRef, useState, type RefObject } from "react";
import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import { fromCargoId, makeInstanceId } from "../../core/utils/cargoId";
import { CargoTooltip, TOOLTIP_ESTIMATED_HEIGHT, TOOLTIP_GAP, TOOLTIP_MIN_WIDTH } from "./CargoTooltip";

import {
  CARGO_LIST_PANEL_TOP,
  CARGO_LIST_PANEL_LEFT,
  CARGO_LIST_PANEL_PADDING,
  CARGO_LIST_PANEL_PADDING_LIST,
  CARGO_LIST_PANEL_BG_EMPTY,
  CARGO_LIST_PANEL_BG_LIST,
  CARGO_LIST_PANEL_BORDER,
  CARGO_LIST_PANEL_BORDER_RADIUS,
  CARGO_LIST_PANEL_FONT_SIZE,
  CARGO_LIST_PANEL_COLOR,
  CARGO_LIST_PANEL_GAP,
  CARGO_LIST_PANEL_MAX_WIDTH,
  CARGO_LIST_CHIP_WIDTH,
  CARGO_LIST_CHIP_HEIGHT,
  CARGO_LIST_CHIP_BORDER,
  CARGO_LIST_CHIP_BORDER_RADIUS,
  CARGO_LIST_CHIP_FONT_SIZE,
  CARGO_LIST_CHIP_COLOR,
  CARGO_LIST_CHIP_FONT_WEIGHT,
  CARGO_LIST_GROUP_BORDER,
  CARGO_LIST_GROUP_BORDER_RADIUS,
  CARGO_LIST_GROUP_PADDING,
  CARGO_LIST_GROUP_GAP,
  CARGO_LIST_PANEL_MAX_HEIGHT,
  CARGO_LIST_PANEL_MIN_WIDTH,
  CARGO_LIST_PANEL_SINGLE_ROW_HEIGHT,
  CARGO_LIST_Z_INDEX,
} from "../../core/constants/cargoList";

interface CargoListProps {
  availableItems: CargoItem[];
  onAddCargo: (cargo: CargoItem) => void;
  onRemoveCargo?: (itemId: string) => void;
  placedInstances: Map<string, Set<number>>;
  numberStart: Map<string, number>;
  // Widget canvas element, used to keep chip tooltips inside the canvas.
  canvasRef?: RefObject<HTMLDivElement | null>;
  // Callback when a pointer drag starts from a list chip.
  onPointerDragStart?: (e: React.PointerEvent, cargo: CargoItem, _instanceIndex: number) => void;
  // Expose the list panel DOM element for hit-testing (canvas->list return).
  // Bound in BOTH render branches (populated panel and empty state) so the
  // external ref always points at a mounted node.
  panelRef?: RefObject<HTMLDivElement | null>;
  // True right after a real drag: the trailing retargeted click must not add a unit.
  shouldSuppressClick?: () => boolean;
}

export const CargoList = React.memo<CargoListProps>(
  ({
    availableItems,
    onAddCargo,
    placedInstances,
    numberStart,
    onPointerDragStart,
    panelRef,
    canvasRef,
    shouldSuppressClick,
  }) => {
    const [hovered, setHovered] = useState<{
      key: string;
      transportOrderNo?: string;
      productName?: string;
      hint: string;
      align: "left" | "right";
      placement: "above" | "below";
      // Canvas-relative chip rect the hoisted tooltip box is anchored to.
      anchor: { left: number; top: number; width: number; height: number };
    } | null>(null);
    const panelRefInternal = useRef<HTMLDivElement | null>(null);
    // Keep internal and external refs on the SAME node in every render branch;
    // pointerup/cancel bubble to the canvas, so no per-node up handler is needed.
    const setPanelRef = (node: HTMLDivElement | null): void => {
      panelRefInternal.current = node;
      if (panelRef) {
        (panelRef as unknown as { current: HTMLDivElement | null }).current = node;
      }
    };

    // The tooltip must escape the panel's scroll container: its overflow clips
    // the tooltip in BOTH flip directions once the list is shorter than the
    // tooltip (short lists), so the tooltip renders as a SIBLING of the panel
    // anchored in canvas coordinates. The canvas element is required for that
    // mapping and is always provided by LoadingCanvasView; without it no
    // tooltip is shown. Rects are viewport coords measured at hover time
    // (flex-wrapped rows make static math unreliable).
    const measureChip = (chip: HTMLElement) => {
      const canvas = canvasRef?.current;
      if (!canvas) {
        return null;
      }
      const chipRect = chip.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      // Right-aligned is the default; anchor the left edge instead when the
      // right-aligned position would cross the canvas' left border (clipped).
      const tooltipLeft = chipRect.left - canvasRect.left + chipRect.width + 8 - TOOLTIP_MIN_WIDTH;
      const align: "left" | "right" = tooltipLeft < 0 ? "left" : "right";
      // Prefer below; flip above when below would cross the canvas' bottom edge
      // and above still fits, so the tooltip always stays visible.
      const fitsBelow = chipRect.bottom + TOOLTIP_GAP + TOOLTIP_ESTIMATED_HEIGHT <= canvasRect.bottom;
      const fitsAbove = chipRect.top - TOOLTIP_GAP - TOOLTIP_ESTIMATED_HEIGHT >= canvasRect.top;
      const placement: "above" | "below" = fitsBelow || !fitsAbove ? "below" : "above";
      return {
        align,
        placement,
        anchor: {
          left: chipRect.left - canvasRect.left,
          top: chipRect.top - canvasRect.top,
          width: chipRect.width,
          height: chipRect.height,
        },
      };
    };

    // No native drag handlers — unified pointer gesture handles all interactions

    // Group the unplaced chips by transport order so each order's units share
    // one dashed enclosure; availableItems order (the truck's order sequence) is kept.
    // Key each group by its entry id (unique per order); placed-instance tracking
    // still uses the suffix-stripped base id from fromCargoId.
    const groups: { id: string; chips: { cargo: CargoItem; instanceIndex: number }[] }[] = [];
    for (const cargo of availableItems) {
      const placedSet = placedInstances.get(fromCargoId(cargo.id)) ?? new Set<number>();
      const quantity = cargo.quantity ?? 1;
      const chips: { cargo: CargoItem; instanceIndex: number }[] = [];
      for (let i = 0; i < quantity; i++) {
        if (placedSet.has(i)) {
          continue;
        }
        chips.push({ cargo, instanceIndex: i });
      }
      if (chips.length > 0) {
        groups.push({ id: cargo.id, chips });
      }
    }

    if (groups.length === 0) {
      // Still a valid drop zone AND the panelRef target (B-0008/B-0011): a
      // fully-placed layout hides the chips, but a card dropped here must still
      // hit-test the list. Keeps a stable one-row drop footprint (48px).
      return (
        <div
          ref={setPanelRef}
          style={{
            position: "absolute",
            top: CARGO_LIST_PANEL_TOP,
            left: CARGO_LIST_PANEL_LEFT,
            minWidth: CARGO_LIST_PANEL_MIN_WIDTH,
            height: CARGO_LIST_PANEL_SINGLE_ROW_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: CARGO_LIST_PANEL_PADDING,
            background: CARGO_LIST_PANEL_BG_EMPTY,
            border: CARGO_LIST_PANEL_BORDER,
            borderRadius: CARGO_LIST_PANEL_BORDER_RADIUS,
            fontSize: CARGO_LIST_PANEL_FONT_SIZE,
            color: CARGO_LIST_PANEL_COLOR,
            boxSizing: "border-box",
          }}>
          No cargo items available
        </div>
      );
    }

    return (
      <>
        <div
          ref={setPanelRef}
          style={{
            position: "absolute",
            top: CARGO_LIST_PANEL_TOP,
            left: CARGO_LIST_PANEL_LEFT,
            display: "flex",
            gap: CARGO_LIST_PANEL_GAP,
            padding: CARGO_LIST_PANEL_PADDING_LIST,
            background: CARGO_LIST_PANEL_BG_LIST,
            border: CARGO_LIST_PANEL_BORDER,
            borderRadius: CARGO_LIST_PANEL_BORDER_RADIUS,
            zIndex: CARGO_LIST_Z_INDEX,
            flexWrap: "wrap",
            maxWidth: CARGO_LIST_PANEL_MAX_WIDTH,
            maxHeight: CARGO_LIST_PANEL_MAX_HEIGHT,
            overflowY: "auto",
            overflowX: "hidden",
            alignContent: "flex-start",
            boxSizing: "border-box",
          }}
          onScroll={() => setHovered(null)}>
          {groups.map((group) => (
            <div
              key={group.id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: CARGO_LIST_GROUP_GAP,
                padding: CARGO_LIST_GROUP_PADDING,
                border: CARGO_LIST_GROUP_BORDER,
                borderRadius: CARGO_LIST_GROUP_BORDER_RADIUS,
                boxSizing: "border-box",
                alignContent: "flex-start",
                maxWidth: "100%",
              }}>
              {group.chips.map(({ cargo, instanceIndex }) => {
                const chipKey = `${cargo.id}-${instanceIndex}`;
                return (
                  <div
                    key={chipKey}
                    onPointerDown={(e) => onPointerDragStart?.(e, cargo, instanceIndex)}
                    onClick={() => {
                      if (shouldSuppressClick?.()) {
                        return;
                      }
                      onAddCargo({ ...cargo, quantity: 1, id: makeInstanceId(cargo.id, instanceIndex) });
                    }}
                    onMouseEnter={(e) => {
                      const measured = measureChip(e.currentTarget);
                      setHovered(
                        measured
                          ? {
                              key: chipKey,
                              transportOrderNo: cargo.transportOrderNo,
                              productName: cargo.productName,
                              hint: `Drag ${cargo.name} onto canvas`,
                              ...measured,
                            }
                          : null
                      );
                    }}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      cursor: "grab",
                      userSelect: "none",
                    }}>
                    <div
                      style={{
                        width: CARGO_LIST_CHIP_WIDTH,
                        height: CARGO_LIST_CHIP_HEIGHT,
                        backgroundColor: cargo.color,
                        border: CARGO_LIST_CHIP_BORDER,
                        borderRadius: CARGO_LIST_CHIP_BORDER_RADIUS,
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: CARGO_LIST_CHIP_FONT_SIZE,
                        color: CARGO_LIST_CHIP_COLOR,
                        fontWeight: CARGO_LIST_CHIP_FONT_WEIGHT,
                      }}>
                      {(numberStart.get(fromCargoId(cargo.id)) ?? 0) + instanceIndex + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {/* Hoisted out of the scroll container: its overflow clips the tooltip
          whenever the list is shorter than the tooltip. */}
        {hovered && (
          <div
            style={{
              position: "absolute",
              left: hovered.anchor.left,
              top: hovered.anchor.top,
              width: hovered.anchor.width,
              height: hovered.anchor.height,
              zIndex: CARGO_LIST_Z_INDEX,
              pointerEvents: "none",
            }}>
            <CargoTooltip
              transportOrderNo={hovered.transportOrderNo}
              productName={hovered.productName}
              hint={hovered.hint}
              align={hovered.align}
              placement={hovered.placement}
            />
          </div>
        )}
      </>
    );
  }
);
