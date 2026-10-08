import type { Positionable, Rotation, Size } from "../../core/types/geometry";
import { ROTATION_STEP } from "../../core/constants/canvas";

// widthScale maps physical length (meters) to screen pixels on the X axis;
// heightScale maps physical width (meters) to the Y axis. The pairing is
// intentionally inverted: "widthScale" scales the model's length extent,
// because the canvas X axis represents truck length. All adapters must pass
// extents through the scale of their *target* axis (see getRotatedScreenSize).
export interface AxisScale {
  widthScale: number;
  heightScale: number;
}

export const DEFAULT_AXIS_SCALE: AxisScale = { widthScale: 1, heightScale: 1 };

/**
 * Rotate clockwise 90 degrees
 */
export const rotate90 = (rotation: Rotation): Rotation => {
  return ((rotation + ROTATION_STEP) % 360) as Rotation;
};

/**
 * Check if object is visually vertical
 */
export const isVerticalRotation = (rotation: Rotation): boolean => {
  return rotation === 90 || rotation === 270;
};

// Screen footprint after rotation under possibly non-uniform axis scaling:
// a 90° turn moves each physical extent onto the other axis, so each extent
// must be projected with the scale of its new axis. With the default uniform
// scale this reduces to a plain length/width swap.
export const getRotatedScreenSize = (size: Size, rotation: Rotation, scale: AxisScale = DEFAULT_AXIS_SCALE): Size => {
  if (!isVerticalRotation(rotation)) {
    return size;
  }

  const axisRatio = scale.widthScale / scale.heightScale;

  return {
    length: size.width * axisRatio,
    width: size.length / axisRatio,
  };
};

// Top-left position and rotation that preserve the visual center of the item,
// projecting both the previous and next footprints through the axis scales.
export const rotateKeepingCenter = (
  item: Size & Positionable & { rotation: Rotation },
  scale: AxisScale = DEFAULT_AXIS_SCALE
): Positionable & { rotation: Rotation } => {
  const newRotation = rotate90(item.rotation);
  const prevVis = getRotatedScreenSize({ length: item.length, width: item.width }, item.rotation, scale);
  const nextVis = getRotatedScreenSize({ length: item.length, width: item.width }, newRotation, scale);

  return {
    rotation: newRotation,
    x: item.x + prevVis.length / 2 - nextVis.length / 2,
    y: item.y + prevVis.width / 2 - nextVis.width / 2,
  };
};
