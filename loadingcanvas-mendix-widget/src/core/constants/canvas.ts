// constants for rendering, coordinate, viewport, scale, grid, and rotation
// canvas

export const DEFAULT_CANVAS_WIDTH = 1800;
export const DEFAULT_CANVAS_HEIGHT = 600;
export const CANVAS_BORDER = "1px solid black";

export const TRUCK_CANVAS_WIDTH = 1453;
export const TRUCK_CANVAS_HEIGHT = 297;
export const TRUCK_CANVAS_LEFT = 333;
export const TRUCK_CANVAS_TOP = 152;

// Reference truck frame height (px). Trucks whose length fits the max width
// render at exactly this height (true length aspect preserved); longer trucks
// cap the length at TRUCK_CANVAS_WIDTH and shrink the height instead.
export const TRUCK_FRAME_HEIGHT_PX = 297;

// layout

export const DEFAULT_MARGIN = "20px auto";

// overlay

export const INFO_PANEL_TOP = 308;
export const INFO_PANEL_RIGHT = 20;
export const INFO_PANEL_Z_INDEX = 1000;
export const INFO_PANEL_PADDING = "4px 4px";
export const INFO_PANEL_BACKGROUND = "#fff";
export const INFO_PANEL_BORDER = "1px solid #ddd";

// grid

export const GRID_SIZE = 20;

export const GRID_LINE_COLOR = "rgba(0, 0, 0, 0.05)";
export const GRID_LINE_WIDTH = 1;
export const GRID_OVERLAY_Z_INDEX = 1;

// truck frame

export const TRUCK_FRAME_BORDER = "2px dashed #888";

// truck background image geometry (Truck_horizontal.png: 1275 x 271 px)
// The loading-area rectangle within the image, in raw image pixels, that must
// be aligned to the proportional truck frame so cargo overlays the truck bed.

export const TRUCK_BACKGROUND_IMAGE_WIDTH = 1275;
export const TRUCK_BACKGROUND_IMAGE_HEIGHT = 271;
export const TRUCK_BACKGROUND_LOAD_X = 234;
export const TRUCK_BACKGROUND_LOAD_Y = 30;
export const TRUCK_BACKGROUND_LOAD_WIDTH = 1030;
export const TRUCK_BACKGROUND_LOAD_HEIGHT = 212;

// Truck drawing vertical midline when the backdrop renders at 100% canvas
// width pinned to the canvas top (center top): natural aspect scaled to the
// canvas width. Frames center on this line so they stay centered in the bed.
export const TRUCK_DRAWING_MIDLINE_Y =
  ((TRUCK_BACKGROUND_IMAGE_HEIGHT / TRUCK_BACKGROUND_IMAGE_WIDTH) * DEFAULT_CANVAS_WIDTH) / 2; // ≈ 191.29

// placement

export const DEFAULT_ADD_POSITION_X = 50;
export const DEFAULT_ADD_POSITION_Y = 50;

// Rendered top-left margin for click-added cargo when the truck is full:
// outside the truck, always visible and selectable.
export const OVERFLOW_MARGIN = 16;

// rotation

export const ROTATION_STEP = 90;

export const SNAP_THRESHOLD = 15;
