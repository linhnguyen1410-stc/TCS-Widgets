// CargoList — panel and chip style constants

// panel (empty state & list)
export const CARGO_LIST_PANEL_TOP = 350;
export const CARGO_LIST_PANEL_LEFT = 10;
export const CARGO_LIST_PANEL_PADDING = "4px 8px";
export const CARGO_LIST_PANEL_PADDING_LIST = "8px 12px";
export const CARGO_LIST_PANEL_BG_EMPTY = "rgba(255, 255, 255, 0.8)";
export const CARGO_LIST_PANEL_BG_LIST = "rgba(255, 255, 255, 0.9)";
export const CARGO_LIST_PANEL_BORDER = "1px solid #ddd";
export const CARGO_LIST_PANEL_BORDER_RADIUS = 4;
export const CARGO_LIST_PANEL_FONT_SIZE = 12;
export const CARGO_LIST_PANEL_COLOR = "#666";
export const CARGO_LIST_PANEL_GAP = 8;
export const CARGO_LIST_PANEL_MAX_WIDTH = "calc(100% - 20px)";

// Empty-state drop zone keeps a stable footprint so a canvas card can be dragged
// back onto the list location even when every unit is already placed (post Auto Load).
export const CARGO_LIST_PANEL_MIN_WIDTH = 180;

// empty state matches exactly one populated row
// 30 (chip) + 16 (padding) + 2 (border) = 48 outer
export const CARGO_LIST_PANEL_SINGLE_ROW_HEIGHT = 48;

// list viewport: exactly 6 rows, scroll beyond
// 6 * 30 (chip) + 5 * 8 (gaps) = 220 content + 16 padding + 2 border = 238 outer
export const CARGO_LIST_MAX_ROWS = 6;
export const CARGO_LIST_PANEL_MAX_HEIGHT = 238;

// chip
export const CARGO_LIST_CHIP_WIDTH = 30;
export const CARGO_LIST_CHIP_HEIGHT = 30;
export const CARGO_LIST_CHIP_BORDER = "1px solid #333";
export const CARGO_LIST_CHIP_BORDER_RADIUS = 2;
export const CARGO_LIST_CHIP_FONT_SIZE = 15;
export const CARGO_LIST_CHIP_COLOR = "#fff";
export const CARGO_LIST_CHIP_FONT_WEIGHT = "normal";

// Transport-order group: the units (chips) of one transport order share one
// dashed enclosure so multi-unit orders read as a set in the list.
export const CARGO_LIST_GROUP_BORDER = "1px dashed #999";
export const CARGO_LIST_GROUP_BORDER_RADIUS = 4;
export const CARGO_LIST_GROUP_PADDING = 4;
export const CARGO_LIST_GROUP_GAP = 4;

// name label
export const CARGO_LIST_NAME_FONT_SIZE = 10;
export const CARGO_LIST_NAME_MARGIN_TOP = 2;
export const CARGO_LIST_NAME_COLOR = "#333";

// z-index (reuse from canvas)
export { INFO_PANEL_Z_INDEX as CARGO_LIST_Z_INDEX } from "./canvas";
