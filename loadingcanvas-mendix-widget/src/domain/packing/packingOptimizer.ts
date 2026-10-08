import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import type { Point, RectLike, Rotation } from "../../core/types/geometry";
import { DEFAULT_AXIS_SCALE, getRotatedScreenSize, type AxisScale } from "../rules/rotationRules";

export interface PackingPlacement {
  itemIndex: number;
  x: number;
  y: number;
  rotation: Rotation;
}

export interface OptimizeOptions {
  allowRotation?: boolean;
  // Wall-clock budget (ms) for the exact search; on expiry the best layout
  // found so far is returned, so the result stays valid at any budget.
  timeLimitMs?: number;
  // Optional already-valid packing used as the starting incumbent.
  seed?: PackingPlacement[];
}

export const DEFAULT_EXACT_TIME_LIMIT_MS = 400;

interface Rect {
  itemIndex: number;
  x: number;
  y: number;
  length: number;
  width: number;
  rotation: Rotation;
}

// Lexicographic objective: maximize placed units, then keep larger cargo nearer
// the loading front (area-weighted front bias — groundwork for a future
// weight-distribution check, BR-24), then minimize used length (load meters,
// BR-17), used width, and the number of 90° turns (BR-26). The planned loading
// sequence (BR-24) is applied afterwards as a slot assignment, because a scalar
// rank cannot express "order 1 owns the cabin-most span" when several lanes share
// the same distance-from-front.
type Rank = [count: number, frontBias: number, usedLength: number, usedWidth: number, rotationSum: number];

const EPS = 1e-4;

const overlapsRect = (a: Rect, b: Rect): boolean => {
  return !(
    a.x + a.length <= b.x + EPS ||
    b.x + b.length <= a.x + EPS ||
    a.y + a.width <= b.y + EPS ||
    b.y + b.width <= a.y + EPS
  );
};

const isInsideRect = (rect: Rect, bounds: RectLike): boolean => {
  return (
    rect.x >= bounds.x - EPS &&
    rect.y >= bounds.y - EPS &&
    rect.x + rect.length <= bounds.x + bounds.length + EPS &&
    rect.y + rect.width <= bounds.y + bounds.width + EPS
  );
};

const rankIsBetter = (candidate: Rank, incumbent: Rank): boolean => {
  if (candidate[0] !== incumbent[0]) return candidate[0] > incumbent[0];
  if (candidate[1] !== incumbent[1]) return candidate[1] < incumbent[1];
  if (candidate[2] !== incumbent[2]) return candidate[2] < incumbent[2];
  if (candidate[3] !== incumbent[3]) return candidate[3] < incumbent[3];
  return candidate[4] < incumbent[4];
};

// A branch that can at best tie the incumbent count is dead once its partial
// secondary measures can no longer strictly improve. frontBias, extents and turn
// counts only grow down a branch (rect.x >= bounds.x keeps every added term
// non-negative), so lexicographic dominance prunes it.
const tieCannotImprove = (partial: Rank, incumbent: Rank): boolean => {
  if (partial[1] !== incumbent[1]) return partial[1] > incumbent[1];
  if (partial[2] !== incumbent[2]) return partial[2] > incumbent[2];
  if (partial[3] !== incumbent[3]) return partial[3] > incumbent[3];
  return partial[4] >= incumbent[4];
};

const visualSize = (item: CargoItem, rotation: Rotation, scale: AxisScale): { length: number; width: number } =>
  getRotatedScreenSize({ length: item.length, width: item.width }, rotation, scale);

const orientationsFor = (item: CargoItem, scale: AxisScale, allowRotation: boolean): Rotation[] => {
  if (!allowRotation) return [0];
  const upright = visualSize(item, 0, scale);
  const turned = visualSize(item, 90, scale);
  return turned.length === upright.length && turned.width === upright.width ? [0] : [0, 90];
};

const sortUniqueAscending = (values: number[]): number[] => [...new Set(values)].sort((a, b) => a - b);

// Normal-form corner candidates: bounds origin plus every placed right edge and
// top/bottom edge. An optimal packing exists where each item's left edge is the
// bounds-left or a placed right edge and each top edge the bounds-top or a
// placed bottom edge, so this finite candidate set keeps the search complete.
const collectEdges = (occupied: Rect[], bounds: RectLike): { xs: number[]; ys: number[] } => ({
  xs: sortUniqueAscending([bounds.x, ...occupied.map((rect) => rect.x + rect.length)]),
  ys: sortUniqueAscending([
    bounds.y,
    ...occupied.map((rect) => rect.y),
    ...occupied.map((rect) => rect.y + rect.width),
  ]),
});

const freeAreaOf = (occupied: Rect[], bounds: RectLike): number =>
  bounds.length * bounds.width - occupied.reduce((sum, rect) => sum + rect.length * rect.width, 0);

const rankOf = (occupied: Rect[], bounds: RectLike): Rank => {
  let frontBias = 0;
  let usedLength = 0;
  let usedWidth = 0;
  let rotationSum = 0;
  for (const rect of occupied) {
    // Area-weighted distance behind the loading front: big cargo costs more the
    // further back it sits, so equal-count layouts prefer big-front arrangements.
    frontBias += rect.length * rect.width * (rect.x - bounds.x);
    usedLength = Math.max(usedLength, rect.x + rect.length);
    usedWidth = Math.max(usedWidth, rect.y + rect.width);
    rotationSum += rect.rotation === 90 ? 1 : 0;
  }
  return [occupied.length, frontBias, usedLength, usedWidth, rotationSum];
};

const clampCandidate = (pos: Point, size: { length: number; width: number }, bounds: RectLike): Point => ({
  x: Math.min(Math.max(pos.x, bounds.x), Math.max(bounds.x, bounds.x + bounds.length - size.length)),
  y: Math.min(Math.max(pos.y, bounds.y), Math.max(bounds.y, bounds.y + bounds.width - size.width)),
});

interface PlacementTuple {
  x: number;
  y: number;
  rotation: Rotation;
}

const tupleLess = (candidate: PlacementTuple, last: PlacementTuple): boolean => {
  if (candidate.y !== last.y) return candidate.y < last.y;
  if (candidate.x !== last.x) return candidate.x < last.x;
  return candidate.rotation < last.rotation;
};

// Deterministic greedy incumbent: largest footprints first, first fitting corner
// (smallest y then x) per orientation, 0° winning strict ties — mirrors the
// shelf packer the optimizer upgrades, so the exact result is never worse.
const greedySeedRects = (items: CargoItem[], bounds: RectLike, scale: AxisScale, allowRotation: boolean): Rect[] => {
  const occupied: Rect[] = [];
  const order = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.length * b.item.width - a.item.length * a.item.width || a.index - b.index);
  for (const { item, index } of order) {
    const { xs, ys } = collectEdges(occupied, bounds);
    let best: Rect | null = null;
    for (const rotation of orientationsFor(item, scale, allowRotation)) {
      const size = visualSize(item, rotation, scale);
      for (const y of ys) {
        let rowFit: Rect | null = null;
        for (const x of xs) {
          const pos = clampCandidate({ x, y }, size, bounds);
          const rect: Rect = { itemIndex: index, x: pos.x, y: pos.y, length: size.length, width: size.width, rotation };
          if (!isInsideRect(rect, bounds) || occupied.some((other) => overlapsRect(rect, other))) continue;
          rowFit = rect;
          break;
        }
        if (rowFit) {
          if (!best || rowFit.y < best.y || (rowFit.y === best.y && rowFit.x < best.x)) best = rowFit;
          break;
        }
      }
    }
    if (best) occupied.push(best);
  }
  return occupied;
};

const toRects = (placements: PackingPlacement[], items: CargoItem[], scale: AxisScale): Rect[] =>
  placements.map((placement) => {
    const size = visualSize(items[placement.itemIndex], placement.rotation, scale);
    return { ...placement, length: size.length, width: size.width };
  });

const seedIsValid = (
  placements: PackingPlacement[],
  items: CargoItem[],
  bounds: RectLike,
  scale: AxisScale
): boolean => {
  const seen = new Set<number>();
  for (const placement of placements) {
    if (!Number.isInteger(placement.itemIndex) || placement.itemIndex < 0 || placement.itemIndex >= items.length) {
      return false;
    }
    if (seen.has(placement.itemIndex)) return false;
    seen.add(placement.itemIndex);
  }
  const rects = toRects(placements, items, scale);
  for (const rect of rects) {
    if (!isInsideRect(rect, bounds)) return false;
    for (const other of rects) {
      if (other !== rect && overlapsRect(rect, other)) return false;
    }
  }
  return true;
};

interface OrientationSize {
  rotation: Rotation;
  length: number;
  width: number;
}

interface GroupDescriptor {
  key: string;
  area: number;
  unitIndices: number[];
  cursor: number;
  orientations: OrientationSize[];
}

export const optimizePacking = (
  items: CargoItem[],
  bounds: RectLike,
  scale: AxisScale = DEFAULT_AXIS_SCALE,
  options: OptimizeOptions = {}
): { placed: CargoItem[]; unplaced: CargoItem[] } => {
  const allowRotation = options.allowRotation ?? true;
  const timeLimitMs = options.timeLimitMs ?? DEFAULT_EXACT_TIME_LIMIT_MS;
  const deadline = Date.now() + Math.max(1, timeLimitMs);
  let timedOut = false;

  // Shape groups: units with an identical footprint are interchangeable, so the
  // search branches per group instead of per unit (22 equal pallets = one node).
  const groupMap = new Map<string, GroupDescriptor>();
  items.forEach((item, index) => {
    const key = `${item.length}x${item.width}`;
    const group = groupMap.get(key);
    if (group) {
      group.unitIndices.push(index);
      return;
    }
    const orientations: OrientationSize[] = [];
    for (const rotation of orientationsFor(item, scale, allowRotation)) {
      const size = visualSize(item, rotation, scale);
      orientations.push({ rotation, length: size.length, width: size.width });
    }
    groupMap.set(key, { key, area: item.length * item.width, unitIndices: [index], cursor: 0, orientations });
  });
  const allGroups = [...groupMap.values()].sort((a, b) => b.area - a.area || (a.key < b.key ? -1 : 1));

  const greedyRects = greedySeedRects(items, bounds, scale, allowRotation);
  const best: { rank: Rank; placed: Rect[] } = { rank: rankOf(greedyRects, bounds), placed: greedyRects };
  if (options.seed && seedIsValid(options.seed, items, bounds, scale)) {
    const seededRects = toRects(options.seed, items, scale);
    const seededRank = rankOf(seededRects, bounds);
    if (rankIsBetter(seededRank, best.rank)) {
      best.rank = seededRank;
      best.placed = seededRects;
    }
  }

  const considerIncumbent = (placed: Rect[]): void => {
    const rank = rankOf(placed, bounds);
    if (rankIsBetter(rank, best.rank)) {
      best.rank = rank;
      best.placed = placed.map((rect) => ({ ...rect }));
    }
  };

  const occupied: Rect[] = [];

  const search = (remaining: GroupDescriptor[], lastByGroup: Map<string, PlacementTuple>): void => {
    if (timedOut) return;
    if (Date.now() >= deadline) {
      timedOut = true;
      return;
    }

    // Upper bound on the units this branch can still add (free area over the
    // smallest remaining footprint); prune when even the count cannot win.
    const freeArea = freeAreaOf(occupied, bounds);
    const minRemainingArea =
      remaining.length > 0 ? Math.min(...remaining.map((group) => group.area)) : Number.POSITIVE_INFINITY;
    const maxPossible =
      occupied.length + (minRemainingArea === Number.POSITIVE_INFINITY ? 0 : Math.floor(freeArea / minRemainingArea));
    if (maxPossible < best.rank[0]) return;
    if (maxPossible === best.rank[0] && tieCannotImprove(rankOf(occupied, bounds), best.rank)) return;

    if (remaining.length === 0) {
      considerIncumbent(occupied);
      return;
    }

    // Retirement of a fully dropped group can always be deferred until the
    // group reaches the front of the list, so retiring only the first group
    // keeps every subset reachable (BR-27: leftover cargo stays unplaced).
    const retired = remaining.shift()!;
    search(remaining, lastByGroup);
    remaining.unshift(retired);
    if (timedOut) return;

    const { xs, ys } = collectEdges(occupied, bounds);
    for (let gi = 0; gi < remaining.length; gi++) {
      const group = remaining[gi];
      const unitIndex = group.unitIndices[group.cursor];
      const last = lastByGroup.get(group.key);
      for (const orientation of group.orientations) {
        for (const y of ys) {
          for (const x of xs) {
            const pos = clampCandidate({ x, y }, orientation, bounds);
            const rect: Rect = {
              itemIndex: unitIndex,
              x: pos.x,
              y: pos.y,
              length: orientation.length,
              width: orientation.width,
              rotation: orientation.rotation,
            };
            if (!isInsideRect(rect, bounds)) continue;
            if (occupied.some((other) => overlapsRect(rect, other))) continue;
            // Equal footprints are interchangeable: accept a group's positions
            // only in non-decreasing (y, x, rotation) order so each position
            // multiset is explored once regardless of interleaving.
            if (last && tupleLess(rect, last)) continue;

            occupied.push(rect);
            lastByGroup.set(group.key, { x: rect.x, y: rect.y, rotation: rect.rotation });
            group.cursor++;
            let removedAt = -1;
            let removed: GroupDescriptor | null = null;
            if (group.cursor >= group.unitIndices.length) {
              removedAt = gi;
              removed = remaining.splice(gi, 1)[0];
            }
            search(remaining, lastByGroup);
            if (removed) {
              remaining.splice(removedAt, 0, removed);
            }
            group.cursor--;
            if (last) {
              lastByGroup.set(group.key, last);
            } else {
              lastByGroup.delete(group.key);
            }
            occupied.pop();
            if (timedOut) return;
          }
        }
      }
    }
  };

  search(allGroups, new Map());

  const placedByIndex = new Map<number, Rect>();
  for (const rect of best.placed) placedByIndex.set(rect.itemIndex, rect);
  const placed: CargoItem[] = [];
  const unplaced: CargoItem[] = [];
  items.forEach((item, index) => {
    const rect = placedByIndex.get(index);
    if (rect) {
      placed.push({ ...item, x: rect.x, y: rect.y, rotation: rect.rotation });
    } else {
      unplaced.push(item);
    }
  });
  return { placed, unplaced };
};
