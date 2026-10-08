import { describe, it, expect } from "@jest/globals";
import { optimizePacking } from "../packingOptimizer";
import type { CargoItem } from "../../../core/types/viewModels/CargoItem";
import type { RectLike } from "../../../core/types/geometry";

const makeCargo = (id: string, length: number, width: number): CargoItem => ({
  id,
  name: id,
  x: 0,
  y: 0,
  length,
  width,
  rotation: 0,
  type: "pallet",
  color: "orange",
  isLocked: false,
});

type Rank = [count: number, frontBias: number, usedLength: number, usedWidth: number, rotationSum: number];

// Visual footprint after a 90° turn (uniform test scale).
const visualOf = (item: { length: number; width: number; rotation: number }): { length: number; width: number } =>
  item.rotation === 90 ? { length: item.width, width: item.length } : { length: item.length, width: item.width };

const overlaps = (a: RectLike, b: RectLike): boolean =>
  !(a.x + a.length <= b.x || b.x + b.length <= a.x || a.y + a.width <= b.y || b.y + b.width <= a.y);

const rectsOf = (placed: CargoItem[]): RectLike[] =>
  placed.map((item) => {
    const visual = visualOf(item);
    return { x: item.x, y: item.y, length: visual.length, width: visual.width };
  });

const isInside = (rect: RectLike, bounds: RectLike): boolean =>
  rect.x >= bounds.x &&
  rect.y >= bounds.y &&
  rect.x + rect.length <= bounds.x + bounds.length &&
  rect.y + rect.width <= bounds.y + bounds.width;

const expectValidPacking = (placed: CargoItem[], bounds: RectLike): void => {
  const rects = rectsOf(placed);
  for (let i = 0; i < rects.length; i++) {
    expect(isInside(rects[i], bounds)).toBe(true);
    for (let j = i + 1; j < rects.length; j++) {
      expect(overlaps(rects[i], rects[j])).toBe(false);
    }
  }
};

const rankOfResult = (placed: CargoItem[], bounds: RectLike): Rank => {
  let frontBias = 0;
  let usedLength = 0;
  let usedWidth = 0;
  for (const rect of rectsOf(placed)) {
    // Mirrors rankOf in packingOptimizer.ts: area-weighted distance behind the front.
    frontBias += rect.length * rect.width * (rect.x - bounds.x);
    usedLength = Math.max(usedLength, rect.x + rect.length);
    usedWidth = Math.max(usedWidth, rect.y + rect.width);
  }
  const rotationSum = placed.filter((item) => item.rotation === 90).length;
  return [placed.length, frontBias, usedLength, usedWidth, rotationSum];
};

// Independent exhaustive reference on a plain integer grid: every unit is placed
// at any free cell or skipped. It shares no placement logic with the optimizer
// (no corner theorem, no grouping), so equal ranks validate the optimizer's
// completeness from first principles on small instances.
const bruteForceRank = (units: Array<{ length: number; width: number }>, bounds: RectLike): Rank => {
  const cells: Array<{ x: number; y: number }> = [];
  for (let y = bounds.y; y <= bounds.y + bounds.width; y++) {
    for (let x = bounds.x; x <= bounds.x + bounds.length; x++) {
      cells.push({ x, y });
    }
  }
  let best: Rank = [0, 0, 0, 0, 0];
  const better = (candidate: Rank, incumbent: Rank): boolean => {
    if (candidate[0] !== incumbent[0]) return candidate[0] > incumbent[0];
    if (candidate[1] !== incumbent[1]) return candidate[1] < incumbent[1];
    if (candidate[2] !== incumbent[2]) return candidate[2] < incumbent[2];
    if (candidate[3] !== incumbent[3]) return candidate[3] < incumbent[3];
    return candidate[4] < incumbent[4];
  };
  const dfs = (index: number, placed: Array<RectLike & { rotation: 0 | 90 }>): void => {
    const rank: Rank = [placed.length, 0, 0, 0, 0];
    for (const rect of placed) {
      rank[1] += rect.length * rect.width * (rect.x - bounds.x);
      rank[2] = Math.max(rank[2], rect.x + rect.length);
      rank[3] = Math.max(rank[3], rect.y + rect.width);
      rank[4] += rect.rotation === 90 ? 1 : 0;
    }
    if (better(rank, best)) best = rank;
    if (index === units.length) return;
    if (placed.length + (units.length - index) < best[0]) return;
    const unit = units[index];
    const variants: Array<{ length: number; width: number; rotation: 0 | 90 }> =
      unit.length === unit.width
        ? [{ length: unit.length, width: unit.width, rotation: 0 }]
        : [
            { length: unit.length, width: unit.width, rotation: 0 },
            { length: unit.width, width: unit.length, rotation: 90 },
          ];
    dfs(index + 1, placed);
    for (const variant of variants) {
      for (const cell of cells) {
        const rect = { x: cell.x, y: cell.y, length: variant.length, width: variant.width, rotation: variant.rotation };
        if (!isInside(rect, bounds)) continue;
        if (placed.some((other) => overlaps(rect, other))) continue;
        dfs(index + 1, [...placed, rect]);
      }
    }
  };
  dfs(0, []);
  return best;
};

// Baseline replica of the current First-Fit Decreasing shelf packer, used to
// assert the optimizer is never worse than the algorithm it replaces.
const replicaGreedyCount = (items: CargoItem[], bounds: RectLike): number => {
  const occupied: RectLike[] = [];
  let count = 0;
  const sorted = [...items].sort((a, b) => b.length * b.width - a.length * a.width);
  for (const item of sorted) {
    const xs = [...new Set([bounds.x, ...occupied.map((rect) => rect.x + rect.length)])].sort((a, b) => a - b);
    const ys = [
      ...new Set([bounds.y, ...occupied.map((rect) => rect.y), ...occupied.map((rect) => rect.y + rect.width)]),
    ].sort((a, b) => a - b);
    let chosen: RectLike | null = null;
    for (const rotation of [0, 90] as const) {
      const size =
        rotation === 90 ? { length: item.width, width: item.length } : { length: item.length, width: item.width };
      for (const y of ys) {
        let rowFit: RectLike | null = null;
        for (const x of xs) {
          const px = Math.min(Math.max(x, bounds.x), Math.max(bounds.x, bounds.x + bounds.length - size.length));
          const py = Math.min(Math.max(y, bounds.y), Math.max(bounds.y, bounds.y + bounds.width - size.width));
          const rect = { x: px, y: py, length: size.length, width: size.width };
          if (isInside(rect, bounds) && !occupied.some((other) => overlaps(rect, other))) {
            rowFit = rect;
            break;
          }
        }
        if (rowFit) {
          if (!chosen || rowFit.y < chosen.y || (rowFit.y === chosen.y && rowFit.x < chosen.x)) chosen = rowFit;
          break;
        }
      }
    }
    if (chosen) {
      occupied.push(chosen);
      count++;
    }
  }
  return count;
};

describe("optimizePacking (exact anytime solver)", () => {
  const TRUCK: RectLike = { x: 0, y: 0, length: 200, width: 100 };

  it("returns empty result for empty input", () => {
    const result = optimizePacking([], TRUCK);
    expect(result.placed).toEqual([]);
    expect(result.unplaced).toEqual([]);
  });

  it("keeps a unit that cannot fit anywhere in unplaced and preserves its identity", () => {
    const huge = makeCargo("huge", 300, 500);
    const small = makeCargo("small", 40, 40);
    small.weightKg = 350;

    const { placed, unplaced } = optimizePacking([huge, small], TRUCK);

    expect(placed.map((item) => item.id)).toEqual(["small"]);
    expect(placed[0].weightKg).toBe(350);
    expect(unplaced).toEqual([huge]);
    expect(unplaced[0]).toBe(huge);
  });

  it("reaches the rank-optimal layout where the greedy seed wastes load length", () => {
    // Greedy first-fit loads A(0,0), B(120,0), C(120,40) → used length 200.
    // The optimum stacks B and C underneath A → used length 120 (BR-17).
    const items = [makeCargo("A", 120, 60), makeCargo("B", 80, 40), makeCargo("C", 40, 40)];

    const { placed, unplaced } = optimizePacking(items, TRUCK);

    expect(unplaced).toEqual([]);
    expectValidPacking(placed, TRUCK);
    expect(rankOfResult(placed, TRUCK)).toEqual([3, 128000, 120, 100, 0]);
  });

  it("preserves the input order inside the placed group", () => {
    const items = [makeCargo("C", 40, 40), makeCargo("B", 80, 40), makeCargo("A", 120, 60)];

    const { placed } = optimizePacking(items, TRUCK);

    expect(placed.map((item) => item.id)).toEqual(["C", "B", "A"]);
  });

  it("is deterministic across repeated runs", () => {
    const items = [makeCargo("A", 120, 60), makeCargo("B", 80, 40), makeCargo("C", 40, 40), makeCargo("D", 60, 60)];

    const first = optimizePacking(items, TRUCK);
    const second = optimizePacking(items, TRUCK);

    expect(first).toEqual(second);
  });

  it("stays valid and never worse than the greedy baseline under a 1 ms budget", () => {
    const bounds: RectLike = { x: 0, y: 0, length: 200, width: 120 };
    const items = [
      makeCargo("a", 60, 40),
      makeCargo("b", 60, 40),
      makeCargo("c", 40, 60),
      makeCargo("d", 40, 40),
      makeCargo("e", 80, 40),
      makeCargo("f", 40, 40),
      makeCargo("g", 60, 40),
      makeCargo("h", 50, 50),
      makeCargo("i", 30, 30),
      makeCargo("j", 45, 45),
    ];

    const { placed } = optimizePacking(items, bounds, undefined, { timeLimitMs: 1 });

    expectValidPacking(placed, bounds);
    expect(placed.length).toBeGreaterThanOrEqual(replicaGreedyCount(items, bounds));
  });

  it("packs identical units identically regardless of input order (group symmetry)", () => {
    const bounds: RectLike = { x: 0, y: 0, length: 200, width: 60 };
    const items = Array.from({ length: 6 }, (_, i) => makeCargo(`pallet-${i}`, 50, 30));
    const shuffled = [items[3], items[0], items[5], items[2], items[4], items[1]];

    const { placed } = optimizePacking(items, bounds);
    const { placed: placedShuffled } = optimizePacking(shuffled, bounds);

    expect(placed).toHaveLength(6);
    expect(placed.every((item) => item.rotation === 0)).toBe(true);
    expect(rankOfResult(placed, bounds)).toEqual([6, 450000, 150, 60, 0]);

    const positions = (result: CargoItem[]): Array<[number, number]> =>
      result.map((item): [number, number] => [item.x, item.y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    expect(positions(placedShuffled)).toEqual(positions(placed));
  });

  it("only turns an item by 90° when the upright orientation cannot fit", () => {
    const narrowBounds: RectLike = { x: 0, y: 0, length: 130, width: 200 };
    const wideItem = makeCargo("wide", 140, 50);

    const withoutRotation = optimizePacking([wideItem], narrowBounds, undefined, { allowRotation: false });
    expect(withoutRotation.placed).toEqual([]);
    expect(withoutRotation.unplaced).toEqual([wideItem]);

    const withRotation = optimizePacking([wideItem], narrowBounds);
    expect(withRotation.placed).toHaveLength(1);
    expect(withRotation.placed[0].rotation).toBe(90);
    expect(rankOfResult(withRotation.placed, narrowBounds)).toEqual([1, 0, 50, 140, 1]);
  });

  it("places bigger cargo nearer the loading front (BR-24 front bias)", () => {
    // Both orderings span 150, so the old length-first rank tied; the area-weighted
    // front bias now deterministically prefers the big-front arrangement.
    const big = makeCargo("big", 100, 100);
    const small = makeCargo("small", 50, 50);

    const { placed, unplaced } = optimizePacking([big, small], TRUCK);

    expect(unplaced).toEqual([]);
    const bigPlaced = placed.find((item) => item.id === "big")!;
    const smallPlaced = placed.find((item) => item.id === "small")!;
    expect(bigPlaced.x).toBeLessThan(smallPlaced.x);
    expect(rankOfResult(placed, TRUCK)).toEqual([2, 250000, 150, 100, 0]);
  });

  it("count still outranks the front bias (BR-24 priority order)", () => {
    // Keeping the big item at the front loads only 1 unit; dropping it loads both
    // smalls — the placed count must win over the front preference.
    const big = makeCargo("big", 150, 100);
    const smalls = [makeCargo("small-1", 60, 60), makeCargo("small-2", 60, 60)];

    const { placed, unplaced } = optimizePacking([big, ...smalls], TRUCK);

    expect(placed.map((item) => item.id)).toEqual(["small-1", "small-2"]);
    expect(unplaced.map((item) => item.id)).toEqual(["big"]);
  });

  it("balances cargo across lanes when the deck width allows", () => {
    const bounds: RectLike = { x: 0, y: 0, length: 200, width: 160 };
    const items = [makeCargo("lane-1", 100, 80), makeCargo("lane-2", 100, 80)];

    const { placed, unplaced } = optimizePacking(items, bounds);

    expect(unplaced).toEqual([]);
    // Lane sharing keeps both units on one X span (front bias 0, span 100).
    expect(new Set(placed.map((item) => item.x)).size).toBe(1);
    expect(rankOfResult(placed, bounds)).toEqual([2, 0, 100, 160, 0]);
  });

  it("completes a full 16-unit load within the anytime budget (perf smoke)", () => {
    const bounds: RectLike = { x: 0, y: 0, length: 400, width: 160 };
    const items = [
      ...Array.from({ length: 8 }, (_, i) => makeCargo(`long-${i}`, 60, 40)),
      ...Array.from({ length: 8 }, (_, i) => makeCargo(`cube-${i}`, 40, 40)),
    ];

    const startedAt = Date.now();
    const { placed, unplaced } = optimizePacking(items, bounds);
    const elapsedMs = Date.now() - startedAt;

    expect(placed).toHaveLength(16);
    expect(unplaced).toEqual([]);
    expectValidPacking(placed, bounds);
    expect(elapsedMs).toBeLessThan(2000);
  });

  it("uses a provided valid seed and survives an invalid one", () => {
    const single = makeCargo("crate", 40, 40);
    const validSeed = [{ itemIndex: 0, x: 10, y: 20, rotation: 0 as const }];

    const seeded = optimizePacking([single], TRUCK, undefined, { seed: validSeed });
    expect(seeded.placed).toHaveLength(1);
    expectValidPacking(seeded.placed, TRUCK);

    const outOfBoundsSeed = [{ itemIndex: 0, x: 500, y: 500, rotation: 0 as const }];
    const invalidSeed = optimizePacking([single], TRUCK, undefined, { seed: outOfBoundsSeed });
    expect(invalidSeed.placed).toHaveLength(1);
    expectValidPacking(invalidSeed.placed, TRUCK);

    const danglingIndexSeed = [{ itemIndex: 7, x: 0, y: 0, rotation: 0 as const }];
    expect(() => optimizePacking([single], TRUCK, undefined, { seed: danglingIndexSeed })).not.toThrow();
  });

  it("matches an exhaustive grid reference on random small instances", () => {
    let seedState = 12345;
    const rnd = (): number => {
      seedState = (seedState * 1103515245 + 12345) % 2147483648;
      return seedState / 2147483648;
    };
    const bounds: RectLike = { x: 0, y: 0, length: 4, width: 3 };

    for (let instance = 0; instance < 24; instance++) {
      const unitCount = 1 + Math.floor(rnd() * 5);
      const units = Array.from({ length: unitCount }, () => ({
        length: 1 + Math.floor(rnd() * 3),
        width: 1 + Math.floor(rnd() * 3),
      }));
      const items = units.map((unit, index) => makeCargo(`u${index}`, unit.length, unit.width));

      const reference = bruteForceRank(units, bounds);
      const { placed } = optimizePacking(items, bounds);

      expect(rankOfResult(placed, bounds)).toEqual(reference);
    }
  });
});
