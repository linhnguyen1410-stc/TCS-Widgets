import type { RectLike, Rotation } from "../../core/types/geometry";
import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import { overlaps, isInsideBounds } from "./geometryRules";
import { DEFAULT_AXIS_SCALE, getRotatedScreenSize, type AxisScale } from "./rotationRules";

export type ValidationError = "OVERLAP" | "OUT_OF_BOUNDS" | "LM_EXCEEDED";

// Sub-physical load-meter tolerance: a span of exactly maxLoadMeters can compute
// a few 1e-15 m over by float drift (34 rotated EUR pallets ≈ 13.600000000000001
// LM on a 13.6 m frame) — an exactly-at-budget load must still be valid.
const LM_EPSILON = 1e-9;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  itemErrors?: Record<string, ValidationError[]>; // Per-item error mapping for UI highlighting
}

// Validate a single item against bounds and other items. allowOverlap skips the
// overlap check for free-placement interaction (BR-46); gate actions such as
// Verify (BR-45) keep the strict check.
export const validateItem = (
  item: RectLike & Partial<{ rotation: Rotation }>,
  bounds: RectLike,
  allItems: Array<RectLike & Partial<{ rotation: Rotation }>>,
  excludeIndex: number = -1,
  scale: AxisScale = DEFAULT_AXIS_SCALE,
  allowOverlap: boolean = false
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!isInsideBounds(item, bounds, scale)) {
    errors.push("OUT_OF_BOUNDS");
  }

  // Check overlaps, skipping the item at excludeIndex
  const hasOverlap =
    !allowOverlap && allItems.some((other, idx) => idx !== excludeIndex && overlaps(item, other, scale));

  if (hasOverlap) {
    errors.push("OVERLAP");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Validate total load meters (LM) against truck's max load meters
export const validateLoadMeters = (
  items: CargoItem[],
  maxLoadMeters: number,
  scale: { widthScale: number; heightScale: number },
  truckFrontDataX: number = 0 // NEW optional parameter: truck front position in data coords
): ValidationResult => {
  // Load meters measure the truck deck length *occupied* along the X axis (BR-17),
  // not the sum of every item's extent: cargo stacked side-by-side across the width
  // (same X span, e.g. a multi-lane load) shares one occupied length and must not be
  // double-counted. Summing per item would always flag a real multi-lane load as
  // LM_EXCEEDED, so we merge the X-projections into continuous deck intervals.
  const intervals = items
    .map((item) => {
      // A 90°/270° rotated item contributes its rotated (width) extent on the X axis;
      // getRotatedScreenSize projects the footprint through the axis scales.
      const visual = getRotatedScreenSize({ length: item.length, width: item.width }, item.rotation, scale);
      // CHANGED: subtract truckFrontDataX to get position relative to truck front
      const relativeStart = (item.x - truckFrontDataX) / scale.widthScale;
      const relativeEnd = (item.x + visual.length - truckFrontDataX) / scale.widthScale;
      return { start: relativeStart, end: relativeEnd };
    })
    .sort((a, b) => a.start - b.start);

  let totalLengthMeters = 0;
  if (intervals.length > 0) {
    let currentStart = intervals[0].start;
    let currentEnd = intervals[0].end;

    for (let i = 1; i < intervals.length; i++) {
      const { start, end } = intervals[i];
      if (start <= currentEnd) {
        // Overlapping or flush edge-to-edge blocks are one continuous deck length.
        if (end > currentEnd) {
          currentEnd = end;
        }
      } else {
        // CHANGED: Only count positive intervals (cargo inside truck)
        if (currentEnd > 0) {
          totalLengthMeters += Math.max(0, currentEnd - Math.max(0, currentStart));
        }
        currentStart = start;
        currentEnd = end;
      }
    }
    // CHANGED: Only count positive intervals
    if (currentEnd > 0) {
      totalLengthMeters += Math.max(0, currentEnd - Math.max(0, currentStart));
    }
  }

  if (totalLengthMeters > maxLoadMeters + LM_EPSILON) {
    return {
      valid: false,
      errors: ["LM_EXCEEDED"],
    };
  }

  return {
    valid: true,
    errors: [],
  };
};

// Validate all items against bounds, each other, and LM
export const validateAll = (
  items: CargoItem[],
  bounds: RectLike,
  options?: {
    maxLoadMeters?: number;
    scale?: { widthScale: number; heightScale: number };
    allowOverlap?: boolean;
    truckFrontDataX?: number; // NEW optional parameter
  }
): ValidationResult => {
  const allErrors: ValidationError[] = [];
  const itemErrors: Record<string, ValidationError[]> = {};

  // 1. Validate each item against bounds and overlaps
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = validateItem(
      item,
      bounds,
      items,
      i,
      options?.scale ?? DEFAULT_AXIS_SCALE,
      options?.allowOverlap ?? false
    );
    if (!result.valid) {
      allErrors.push(...result.errors);
      itemErrors[item.id] = result.errors;
    }
  }

  // 2. Validate load meters
  if (options?.maxLoadMeters && options?.scale) {
    const lmResult = validateLoadMeters(items, options.maxLoadMeters, options.scale, options.truckFrontDataX ?? 0);
    if (!lmResult.valid) {
      allErrors.push(...lmResult.errors);
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    itemErrors,
  };
};

// Total packing units across all transport orders; one entry carries multiplicity.
export const getExpectedUnitCount = (availableCargo: CargoItem[]): number => {
  let total = 0;
  for (const cargo of availableCargo) {
    total += cargo.quantity ?? 1;
  }
  return total;
};

// Complete only when every unit is placed and the available list is empty (BR-40).
export const isLoadingComplete = (
  availableCargo: CargoItem[],
  placedCount: number,
  remainingCount: number
): boolean => {
  return placedCount === getExpectedUnitCount(availableCargo) && remainingCount === 0;
};
