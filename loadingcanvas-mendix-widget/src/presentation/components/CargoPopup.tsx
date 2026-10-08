import type { FC, ReactElement } from "react";

export const POPUP_MAX_WIDTH = 320;

export const POPUP_MARGIN_OFFSET = 8;

interface CargoPopupProps {
  transportOrderNo?: string;
  productName?: string;
  producerName?: string;
  companyFromName?: string;
  companyToName?: string;

  side?: "left" | "right";
}

const Row = ({ label, value }: { label: string; value?: string }): ReactElement | null =>
  value ? (
    <div style={{ marginBottom: 2 }}>
      <span style={{ fontWeight: 600, marginRight: 6 }}>{label}:</span>
      {value}
    </div>
  ) : null;

// Double-click popup shown beside a cargo card, alongside the hover tooltip.
// Renders on the right by default; flips to the left when it would overflow the
// canvas right edge. See ARCHITECTURE.md -> CargoCard/CargoPopup.
export const CargoPopup: FC<CargoPopupProps> = ({
  transportOrderNo,
  productName,
  producerName,
  companyFromName,
  companyToName,
  side = "right",
}) => {
  if (!transportOrderNo && !productName && !producerName && !companyFromName && !companyToName) {
    return null;
  }

  const offset =
    side === "left"
      ? { right: "100%", marginRight: POPUP_MARGIN_OFFSET }
      : { left: "100%", marginLeft: POPUP_MARGIN_OFFSET };

  return (
    <div
      style={{
        position: "absolute",
        ...offset,
        top: 0,
        minWidth: 220,
        maxWidth: POPUP_MAX_WIDTH,
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
      <Row label="Order" value={transportOrderNo} />
      <Row label="Product" value={productName} />
      <Row label="By" value={producerName} />
      <Row label="From" value={companyFromName} />
      <Row label="To" value={companyToName} />
    </div>
  );
};
