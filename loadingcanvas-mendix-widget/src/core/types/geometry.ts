/**
 * Basic coordinate
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Length / Width
 * `length` = extent along X (truck length), `width` = extent along Y (footprint width).
 */
export interface Size {
  length: number;
  width: number;
}

/**
 * Position only
 */
export interface Positionable {
  x: number;
  y: number;
}

/**
 * Dimension only
 */
export interface Sizeable {
  length: number;
  width: number;
}

/**
 * Rotation support
 */
export interface Rotatable {
  rotation: Rotation;
}

/**
 * Any object that has:
 * x, y, length, width
 */
export interface RectLike extends Positionable, Sizeable {}

/**
 * Geometry object
 */
export interface GeometryItem extends Positionable, Sizeable, Rotatable {}

/**
 * Bounding rectangle
 */
export interface Rectangle {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Rotation allowed by editor
 */
export type Rotation = 0 | 90 | 180 | 270;
