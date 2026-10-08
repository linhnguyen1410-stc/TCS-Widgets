import type { Point, Rotation, RectLike } from "../../core/types/geometry";
import { snapToGrid } from "../rules/snapRules";
import { DEFAULT_AXIS_SCALE, getRotatedScreenSize, type AxisScale } from "../rules/rotationRules";
import { GRID_SIZE, SNAP_THRESHOLD } from "../../core/constants/canvas";

export interface SnapTarget {
  position: Point;
  type: "edge" | "align" | "boundary" | "grid" | "angle" | "none";
  distance: number;
}

// Configuration for snap calculations
export interface SnapConfig {
  bounds?: RectLike; // Bounding rectangle for boundary snapping
  gridSize: number; // Grid size for grid snapping (0 disables)
  threshold: number; // Maximum distance to snap (pixels)
  scale?: AxisScale; // Axis scales for rotation-aware footprints
}

// Internal representation of a snap candidate along a single axis
interface SnapCandidate {
  position: number;
  type: SnapTarget["type"];
  distance: number;
}

// Default configuration values
const DEFAULT_SNAP_CONFIG: SnapConfig = {
  gridSize: GRID_SIZE,
  threshold: SNAP_THRESHOLD,
};

// Evaluates a snap candidate against the current best candidate
function evaluateCandidate(current: SnapCandidate, candidate: SnapCandidate): SnapCandidate {
  return candidate.distance < current.distance ? candidate : current;
}

// Creates a snap candidate for a target position
function createCandidate(position: number, type: SnapTarget["type"], targetPos: number): SnapCandidate {
  return {
    position,
    type,
    distance: Math.abs(targetPos - position),
  };
}

// Calculates boundary snap candidates for a single axis
function calculateBoundaryCandidates(
  targetPos: number,
  itemSize: number,
  bounds: RectLike,
  axis: "x" | "y"
): SnapCandidate[] {
  const boundsStart = axis === "x" ? bounds.x : bounds.y;
  const boundsEnd = axis === "x" ? bounds.x + bounds.length : bounds.y + bounds.width;

  return [
    createCandidate(boundsStart, "boundary", targetPos),
    createCandidate(boundsEnd - itemSize, "boundary", targetPos),
  ];
}

// Calculates edge and alignment snap candidates for a single axis against another item
function calculateItemSnapCandidates(
  targetPos: number,
  itemSize: number,
  other: RectLike,
  otherSize: number,
  axis: "x" | "y"
): SnapCandidate[] {
  const otherStart = axis === "x" ? other.x : other.y;
  const otherEnd = axis === "x" ? other.x + otherSize : other.y + otherSize;

  return [
    createCandidate(otherEnd, "edge", targetPos), // Edge: item touching other's far edge
    createCandidate(otherStart - itemSize, "edge", targetPos), // Edge: item touching other's near edge
    createCandidate(otherStart, "align", targetPos), // Align: item's near edge aligned with other's near edge
    createCandidate(otherEnd - itemSize, "align", targetPos), // Align: item's far edge aligned with other's far edge
  ];
}

// Calculates grid snap candidate for a single axis
function calculateGridCandidate(targetPos: number, gridSize: number, threshold: number): SnapCandidate | null {
  if (gridSize <= 0) {
    return null;
  }

  const gridPos = snapToGrid(targetPos, gridSize);
  const distance = Math.abs(targetPos - gridPos);

  if (distance <= threshold) {
    return createCandidate(gridPos, "grid", targetPos);
  }

  return null;
}

// Finds the best snap candidate from a list of candidates
function pickByTier(candidates: SnapCandidate[], threshold: number): SnapCandidate | null {
  // Tier priority (B-0004): boundary > edge > align. The closest candidate of the
  // HIGHEST tier with any candidate within threshold wins — a closer lower-tier
  // candidate never overrides a higher tier (the documented order is enforced).
  for (const tier of TIER_ORDER) {
    const inTier = candidates.filter((candidate) => candidate.type === tier && candidate.distance <= threshold);
    if (inTier.length > 0) {
      return inTier.reduce((best, candidate) => evaluateCandidate(best, candidate));
    }
  }
  return null;
}

const TIER_ORDER: readonly SnapTarget["type"][] = ["boundary", "edge", "align"];

export class SnapEngine {
  // Calculates the best snap target for an item being dragged
  // Priority: 1. Boundary 2. Edge contact 3. Alignment 4. Grid (fallback)
  calculateSnapTarget<T extends RectLike & { rotation?: Rotation }>(
    item: T,
    others: T[],
    targetPos: Point,
    config: Partial<SnapConfig> = {}
  ): SnapTarget {
    const {
      bounds,
      gridSize = DEFAULT_SNAP_CONFIG.gridSize,
      threshold = DEFAULT_SNAP_CONFIG.threshold,
      scale = DEFAULT_AXIS_SCALE,
    } = config;

    const itemVis = getRotatedScreenSize({ length: item.length, width: item.width }, item.rotation ?? 0, scale);

    // Collect all X-axis candidates
    const xCandidates: SnapCandidate[] = [];

    // 1. Boundary snap candidates
    if (bounds) {
      xCandidates.push(...calculateBoundaryCandidates(targetPos.x, itemVis.length, bounds, "x"));
    }

    // 2. Edge contact & alignment candidates against other items
    for (const other of others) {
      const otherVis = getRotatedScreenSize({ length: other.length, width: other.width }, other.rotation ?? 0, scale);

      xCandidates.push(...calculateItemSnapCandidates(targetPos.x, itemVis.length, other, otherVis.length, "x"));
    }

    // 3. Tiered selection; grid only when no boundary/edge/align is within threshold
    let bestX = pickByTier(xCandidates, threshold);
    if (!bestX) {
      bestX = calculateGridCandidate(targetPos.x, gridSize, threshold);
    }

    // Collect all Y-axis candidates
    const yCandidates: SnapCandidate[] = [];

    // 1. Boundary snap candidates
    if (bounds) {
      yCandidates.push(...calculateBoundaryCandidates(targetPos.y, itemVis.width, bounds, "y"));
    }

    // 2. Edge contact & alignment candidates against other items
    for (const other of others) {
      const otherVis = getRotatedScreenSize({ length: other.length, width: other.width }, other.rotation ?? 0, scale);

      yCandidates.push(...calculateItemSnapCandidates(targetPos.y, itemVis.width, other, otherVis.width, "y"));
    }

    // 3. Tiered selection; grid only when no boundary/edge/align is within threshold
    let bestY = pickByTier(yCandidates, threshold);
    if (!bestY) {
      bestY = calculateGridCandidate(targetPos.y, gridSize, threshold);
    }

    const finalBestX: SnapCandidate = bestX ?? { position: targetPos.x, type: "none", distance: threshold + 1 };
    const finalBestY: SnapCandidate = bestY ?? { position: targetPos.y, type: "none", distance: threshold + 1 };

    const maxDistance = Math.max(
      finalBestX.distance <= threshold ? finalBestX.distance : 0,
      finalBestY.distance <= threshold ? finalBestY.distance : 0
    );

    const resultType =
      finalBestX.type !== "none" ? finalBestX.type : finalBestY.type !== "none" ? finalBestY.type : "none";

    return {
      position: { x: finalBestX.position, y: finalBestY.position },
      type: resultType,
      distance: maxDistance,
    };
  }
}
