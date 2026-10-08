import type { FC } from "react";

// Shared with CargoList's overflow check so style and measurement never drift.
export const TOOLTIP_MIN_WIDTH = 180;
// Conservative height estimate (real is 33-75px) so the flip triggers early, never clipped.
export const TOOLTIP_ESTIMATED_HEIGHT = 96;
export const TOOLTIP_GAP = 8;

// "right" aligns the tooltip's right edge to the anchor (default, canvas cards);
// "left" anchors its left edge so chips near the canvas' left border stay inside.
type TooltipAlign = "left" | "right";

// "below" hangs under the anchor (default, keeps RotationHandle clear);
// "above" renders over the anchor when there is no room below (list bottom row).
type TooltipPlacement = "above" | "below";

interface CargoTooltipProps {
  transportOrderNo?: string;
  productName?: string;
  // Optional action line shown first (e.g. the cargo list's drag affordance).
  hint?: string;
  align?: TooltipAlign;
  placement?: TooltipPlacement;
}

export const CargoTooltip: FC<CargoTooltipProps> = ({
  transportOrderNo,
  productName,
  hint,
  align = "right",
  placement = "below",
}) => {
  if (!transportOrderNo && !productName && !hint) {
    return null;
  }

  const horizontalStyle = align === "left" ? { left: 0 } : { right: "-8px" };
  const verticalStyle =
    placement === "above" ? { bottom: "100%", marginBottom: TOOLTIP_GAP } : { top: "100%", marginTop: TOOLTIP_GAP };

  return (
    <div
      style={{
        position: "absolute",
        // Below by default so it never covers the RotationHandle on the
        // card's top edge; pointerEvents: none keeps card hover/drag intact.
        ...verticalStyle,
        ...horizontalStyle,
        minWidth: TOOLTIP_MIN_WIDTH,
        maxWidth: 280,
        padding: "8px 12px",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        color: "#fff",
        borderRadius: 6,
        fontSize: 12,
        fontFamily: "system-ui, -apple-system, sans-serif",
        lineHeight: 1.4,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        zIndex: 1000,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        overflow: "hidden",
      }}>
      {hint && <div style={{ color: "#ddd", marginBottom: transportOrderNo || productName ? 4 : 0 }}>{hint}</div>}
      {transportOrderNo && <div style={{ marginBottom: productName ? 4 : 0 }}>Order: {transportOrderNo}</div>}
      {productName && <div>Product: {productName}</div>}
    </div>
  );
};
