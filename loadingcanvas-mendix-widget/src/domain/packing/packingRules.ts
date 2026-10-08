import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import type { RectLike, Rotation } from "../../core/types/geometry";
import { findCollisions, isInsideBounds } from "../rules/geometryRules";
import { optimizePacking } from "./packingOptimizer";
import { DEFAULT_AXIS_SCALE, getRotatedScreenSize, type AxisScale } from "../rules/rotationRules";
import { fromCargoId, makeInstanceId } from "../../core/utils/cargoId";

export interface PackingOptions {
  allowRotation?: boolean;
  // Units at or below this count are packed by the exact anytime solver; larger
  // loads fall back to the deterministic skyline heuristic.
  exactLimit?: number;
  // Wall-clock budget (ms) handed to the exact solver.
  timeLimitMs?: number;
}

export interface PackingResult {
  placed: CargoItem[];
  unplaced: CargoItem[];
}

interface Placement {
  x: number;
  y: number;
  rotation: Rotation;
}

const ORIENTATIONS: Rotation[] = [0, 90];

interface Size2D {
  length: number;
  width: number;
}

const getVisualSize = (item: CargoItem, rotation: Rotation, scale: AxisScale): Size2D => {
  return getRotatedScreenSize({ length: item.length, width: item.width }, rotation, scale);
};

// Larger footprints are placed first so small items fill the remaining gaps
// instead of blocking large ones.
const byAreaDescending = (a: CargoItem, b: CargoItem): number => b.length * b.width - a.length * a.width;

// Loads at or below this unit count are packed by the proven-optimal anytime
// search; bigger loads use the skyline heuristic further down.
const DEFAULT_EXACT_UNIT_LIMIT = 16;

const EPSILON = 1e-4;

// Strict-eps rect intersection, mirroring the exact solver's overlapsRect.
const rectsIntersect = (a: RectLike, b: RectLike): boolean =>
  !(
    a.x + a.length <= b.x + EPSILON ||
    b.x + b.length <= a.x + EPSILON ||
    a.y + a.width <= b.y + EPSILON ||
    b.y + b.width <= a.y + EPSILON
  );

interface SkylineSegment {
  x: number;
  y: number;
  width: number;
}

// Left-anchored skyline spot: anchor at every segment, bridge neighbours until
// the footprint fits; the deepest frontier in the span sets the top edge. The
// leftmost spot wins, then the lowest — big cargo (placed first, BR-24) accumulates
// at the loading front instead of spreading across the bottom lane. 0° wins strict
// (x, y) ties over 90° (BR-26).
const findSkylineSpot = (
  item: CargoItem,
  segments: SkylineSegment[],
  bounds: RectLike,
  scale: AxisScale,
  allowRotation: boolean,
  orientationOrder: readonly Rotation[] = ORIENTATIONS
): { x: number; y: number; rotation: Rotation } | null => {
  let best: { x: number; y: number; rotation: Rotation } | null = null;
  const orientations: Rotation[] = allowRotation ? [...orientationOrder] : [0];
  for (const rotation of orientations) {
    const size = getVisualSize(item, rotation, scale);
    for (let start = 0; start < segments.length; start++) {
      let spanWidth = 0;
      let top = bounds.y;
      for (let index = start; index < segments.length && spanWidth < size.length; index++) {
        spanWidth += segments[index].width;
        top = Math.max(top, segments[index].y);
      }
      // Sub-pixel tolerance: frontier segment widths are computed as
      // (bounds edge − accumulated x) and can land a few 1e-13 px under an
      // exact-fit footprint (17 rotated EUR columns on a 1453 px frame).
      if (spanWidth + EPSILON < size.length) continue;
      if (top + size.width > bounds.y + bounds.width + EPSILON) continue;
      const x = segments[start].x;
      if (!best || x < best.x || (x === best.x && top < best.y)) {
        best = { x, y: top, rotation };
      }
    }
  }
  return best;
};

// Raises the frontier across the placed span to the rect's bottom edge; free
// pockets under uneven spans are sacrificed (standard skyline approximation).
const updateSkyline = (segments: SkylineSegment[], rect: RectLike): SkylineSegment[] => {
  const next: SkylineSegment[] = [];
  for (const segment of segments) {
    const segmentEnd = segment.x + segment.width;
    if (segmentEnd <= rect.x + EPSILON || segment.x >= rect.x + rect.length - EPSILON) {
      next.push(segment);
      continue;
    }
    const leftWidth = rect.x - segment.x;
    if (leftWidth > EPSILON) {
      next.push({ x: segment.x, y: segment.y, width: leftWidth });
    }
    const coveredStart = Math.max(segment.x, rect.x);
    const coveredEnd = Math.min(segmentEnd, rect.x + rect.length);
    if (coveredEnd - coveredStart > EPSILON) {
      next.push({ x: coveredStart, y: rect.y + rect.width, width: coveredEnd - coveredStart });
    }
    const rightWidth = segmentEnd - (rect.x + rect.length);
    if (rightWidth > EPSILON) {
      next.push({ x: rect.x + rect.length, y: segment.y, width: rightWidth });
    }
  }
  const merged: SkylineSegment[] = [];
  for (const segment of next.sort((a, b) => a.x - b.x)) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      Math.abs(previous.y - segment.y) <= EPSILON &&
      Math.abs(previous.x + previous.width - segment.x) <= EPSILON
    ) {
      previous.width += segment.width;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
};

// Deterministic dense fallback for loads beyond the exact solver's unit limit:
// left-anchored skyline frontier with optional 90° rotation, flush edge-to-edge.
// The orientation order is a parameter so packCargoIntoBounds can try the
// upright-first and rotated-first passes and keep the higher placed count.
const packSkylineIntoBounds = (
  items: CargoItem[],
  bounds: RectLike,
  scale: AxisScale,
  allowRotation: boolean,
  orientationOrder: readonly Rotation[] = ORIENTATIONS
): PackingResult => {
  const sorted = [...items].sort(byAreaDescending);
  let segments: SkylineSegment[] = [{ x: bounds.x, y: bounds.y, width: bounds.length }];
  const occupied: RectLike[] = [];
  const placements = new Map<CargoItem, Placement>();

  for (const item of sorted) {
    const spot = findSkylineSpot(item, segments, bounds, scale, allowRotation, orientationOrder);
    if (!spot) {
      continue;
    }
    const size = getVisualSize(item, spot.rotation, scale);
    const rect: RectLike = { x: spot.x, y: spot.y, length: size.length, width: size.width };
    if (!isInsideBounds(rect, bounds, scale) || findCollisions(rect, occupied, scale).length > 0) {
      // The frontier math above already guarantees free space; skip rather than
      // corrupt the layout if floating-point drift ever disagrees.
      continue;
    }
    occupied.push(rect);
    segments = updateSkyline(segments, rect);
    placements.set(item, { x: rect.x, y: rect.y, rotation: spot.rotation });
  }

  return {
    placed: items.filter((item) => placements.has(item)).map((item) => ({ ...item, ...placements.get(item)! })),
    unplaced: items.filter((item) => !placements.has(item)),
  };
};

// Walls-inward lane spread (BR-25): partial columns hug BOTH side walls (canvas
// top and bottom = both trailer walls) before the middle lane, so the load never
// clings to one side. Items sharing an x anchor re-slot Y alternately — the top
// stack grows down, the bottom stack grows up — which is overlap-free inside the
// stack by construction (total lane height already fits the deck). Every re-slot
// is collision-checked against differently anchored neighbours and the whole
// group keeps its original positions on any conflict, so the spread can never
// invalidate a packing. X positions (front bias, load meters) never change.
const spreadStacksToWalls = (placed: CargoItem[], bounds: RectLike, scale: AxisScale): CargoItem[] => {
  if (placed.length === 0) {
    return placed;
  }

  // Current visual rect of every placed item, updated as groups commit.
  const rects = new Map<CargoItem, RectLike>();
  for (const item of placed) {
    const size = getVisualSize(item, item.rotation, scale);
    rects.set(item, { x: item.x, y: item.y, length: size.length, width: size.width });
  }

  const byAnchor = new Map<number, CargoItem[]>();
  for (const item of placed) {
    const stack = byAnchor.get(item.x) ?? [];
    stack.push(item);
    byAnchor.set(item.x, stack);
  }

  const moved = new Map<CargoItem, number>();
  for (const anchor of [...byAnchor.keys()].sort((a, b) => a - b)) {
    const stack = byAnchor.get(anchor)!;
    if (stack.length < 2) {
      continue;
    }

    let topY = bounds.y;
    let bottomY = bounds.y + bounds.width;
    const candidates: RectLike[] = [];
    const moves = new Map<CargoItem, number>();
    for (let i = 0; i < stack.length; i++) {
      const rect = rects.get(stack[i])!;
      const y = i % 2 === 0 ? topY : bottomY - rect.width;
      if (i % 2 === 0) {
        topY += rect.width;
      } else {
        bottomY -= rect.width;
      }
      moves.set(stack[i], y);
      candidates.push({ ...rect, y });
    }

    const others = placed.filter((item) => !stack.includes(item));
    const conflict = candidates.some((candidate) =>
      others.some((other) => rectsIntersect(candidate, rects.get(other)!))
    );
    if (conflict) {
      continue;
    }

    for (const [item, y] of moves) {
      const rect = rects.get(item)!;
      rects.set(item, { ...rect, y });
      moved.set(item, y);
    }
  }

  if (moved.size === 0) {
    return placed;
  }
  return placed.map((item) => (moved.has(item) ? { ...item, y: moved.get(item)! } : item));
};

// Sequence priority for slot assignment: sequenced units load in order, units
// without a sequence load last. Only used for ordering, so a large finite sentinel
// is safe (no arithmetic is performed on it).
const sequencePriorityOf = (item: CargoItem): number =>
  typeof item.sequence === "number" && Number.isFinite(item.sequence) ? item.sequence : Number.MAX_SAFE_INTEGER;

// Slot assignment by planned loading order (BR-24): the geometry decides WHERE the
// slots are, the OrderSequence decides WHICH unit occupies which slot. Within each
// identical-footprint group (interchangeable units) the front-most slots — smallest
// x, then smallest y — go to the units in sequence order, so order 1 ends up nearest
// the cabin. Only the unit -> slot mapping changes: the placed count, span, overlaps
// and load meters are untouched. No-op when the truck carries no sequence data.
const assignSlotsBySequence = (placed: CargoItem[]): CargoItem[] => {
  const hasSequence = placed.some((item) => typeof item.sequence === "number" && Number.isFinite(item.sequence));
  if (!hasSequence) {
    return placed;
  }

  const groups = new Map<string, CargoItem[]>();
  for (const item of placed) {
    const key = `${item.length}x${item.width}`;
    const group = groups.get(key);
    if (group) {
      group.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  const reassigned = new Map<CargoItem, CargoItem>();
  for (const group of groups.values()) {
    if (group.length < 2) {
      continue;
    }
    const slots = group
      .map((item) => ({ x: item.x, y: item.y, rotation: item.rotation }))
      .sort((a, b) => a.x - b.x || a.y - b.y);
    // Array.prototype.sort is stable, so equal sequences keep their original order.
    const byPriority = [...group].sort((a, b) => sequencePriorityOf(a) - sequencePriorityOf(b));
    byPriority.forEach((item, index) => {
      const slot = slots[index];
      reassigned.set(item, { ...item, x: slot.x, y: slot.y, rotation: slot.rotation });
    });
  }

  return placed.map((item) => reassigned.get(item) ?? item);
};

// Repacks all given cargo items into bounds. Small/medium loads are solved
// exactly (maximize placed units, then front-weight larger cargo, then minimize
// used length, width, and 90° turns) under a wall-clock budget; larger loads use
// the left-anchored skyline tried in both orientation orders, keeping the
// rotated-first result only when it places strictly more units (BR-24 count
// first, BR-26 upright preferred on ties). Items sit flush edge-to-edge inside a
// stack; partial columns load walls-inward (BR-25). Anything that does not fit
// anywhere is returned in `unplaced`. Input item order is preserved per group.
// The planned loading sequence (BR-24) is applied last as a slot assignment, so
// order 1 occupies the cabin-most slots.
export const packCargoIntoBounds = (
  items: CargoItem[],
  bounds: RectLike,
  scale: AxisScale = DEFAULT_AXIS_SCALE,
  options: PackingOptions = {}
): PackingResult => {
  const allowRotation = options.allowRotation ?? true;
  let result: PackingResult;
  if (items.length <= (options.exactLimit ?? DEFAULT_EXACT_UNIT_LIMIT)) {
    result = optimizePacking(items, bounds, scale, { allowRotation, timeLimitMs: options.timeLimitMs });
  } else {
    const uprightFirst = packSkylineIntoBounds(items, bounds, scale, allowRotation);
    if (!allowRotation) {
      result = uprightFirst;
    } else {
      const rotatedFirst = packSkylineIntoBounds(items, bounds, scale, allowRotation, [90, 0]);
      result = rotatedFirst.placed.length > uprightFirst.placed.length ? rotatedFirst : uprightFirst;
    }
  }
  return { ...result, placed: assignSlotsBySequence(spreadStacksToWalls(result.placed, bounds, scale)) };
};

// Expands raw available-cargo entries by their quantity into per-instance canvas
// items (ids "cargo-<orderGuid>-<i>"). Canvas instances are already one unit per
// item and must never be re-expanded; re-expanding would double the cargo on a
// second Auto Load run and nest the instance suffix ("cargo-G-0-0"), which no
// longer resolves back to the base order GUID via fromCargoId.
export const expandCargoByQuantity = (cargo: CargoItem[]): CargoItem[] => {
  const expanded: CargoItem[] = [];
  for (const item of cargo) {
    const quantity = item.quantity ?? 1;
    for (let i = 0; i < quantity; i++) {
      expanded.push({
        ...item,
        id: makeInstanceId(item.id, i),
      });
    }
  }
  return expanded;
};

// Auto Load input assembly: canvas items are units that pass through unchanged;
// only the still-listed raw entries carry multiplicity and must be expanded first.
// placedInstances maps base transport order ID -> the set of instance indices
// already on canvas, so partially placed orders only expand the unplaced indices
// (avoiding duplicate ids while preserving each unit's number).
export const autoLoadCargoUnits = (
  onCanvas: CargoItem[],
  stillInList: CargoItem[],
  placedInstances: Map<string, Set<number>> = new Map()
): CargoItem[] => {
  const expanded: CargoItem[] = [...onCanvas];
  for (const item of stillInList) {
    const quantity = item.quantity ?? 1;
    const baseId = fromCargoId(item.id);
    const placedSet = placedInstances.get(baseId) ?? new Set<number>();
    for (let i = 0; i < quantity; i++) {
      if (placedSet.has(i)) {
        continue;
      }
      expanded.push({
        ...item,
        id: makeInstanceId(item.id, i),
      });
    }
  }
  return expanded;
};
