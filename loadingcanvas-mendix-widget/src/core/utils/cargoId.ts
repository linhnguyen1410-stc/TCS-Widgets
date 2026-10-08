// Single convention for the "cargo-" prefixed canvas IDs. Canvas items are keyed
// by TransportOrder GUID; the prefix marks them as canvas cargo so they can be
// told apart from raw entity GUIDs in the pallet list and saved-plan flows.
// Instance suffix (-0, -1, etc.) is used for multiple items from same transport order.
export const CARGO_ID_PREFIX = "cargo-";

export const toCargoId = (id: string): string => (id.startsWith(CARGO_ID_PREFIX) ? id : `${CARGO_ID_PREFIX}${id}`);

// Single producer for canvas instance ids: `cargo-<orderGuid>-<index>`.
// Every suffixing site (list chips, drag data, drop, click-add, auto-load,
// plan load) must call this; a `-${i}` interpolation anywhere else is a T1
// identity bug (template 16-§16.2-a / BUGLOG B-0005).
export const makeInstanceId = (baseId: string, index: number): string => `${toCargoId(baseId)}-${index}`;

// Single authoritative distribution helper (template 16-§16.2-a): the exact
// placed-instance map (base id -> set of instance indices) used by the pallet
// list, Verify, Auto Load, plan load and save — never recompute it per site.
export const placedInstancesOf = (items: readonly { id: string }[]): Map<string, Set<number>> => {
  const placed = new Map<string, Set<number>>();
  for (const item of items) {
    const baseId = fromCargoId(item.id);
    const set = placed.get(baseId) ?? new Set<number>();
    set.add(getCargoInstanceIndex(item.id));
    placed.set(baseId, set);
  }
  return placed;
};

// Extracts base TransportOrder GUID from a cargo ID, stripping any instance suffix (-0, -1, etc.)
export const fromCargoId = (id: string): string => {
  if (!id.startsWith(CARGO_ID_PREFIX)) {
    return id;
  }
  const withoutPrefix = id.slice(CARGO_ID_PREFIX.length);
  // Remove instance suffix like "-0", "-1", etc.
  const dashIndex = withoutPrefix.lastIndexOf("-");
  if (dashIndex > 0 && /^\d+$/.test(withoutPrefix.slice(dashIndex + 1))) {
    return withoutPrefix.slice(0, dashIndex);
  }
  return withoutPrefix;
};

// Get the instance index from a cargo ID (0, 1, 2...), or 0 if not present
export const getCargoInstanceIndex = (id: string): number => {
  if (!id.startsWith(CARGO_ID_PREFIX)) {
    return 0;
  }
  const withoutPrefix = id.slice(CARGO_ID_PREFIX.length);
  const dashIndex = withoutPrefix.lastIndexOf("-");
  if (dashIndex > 0 && /^\d+$/.test(withoutPrefix.slice(dashIndex + 1))) {
    return parseInt(withoutPrefix.slice(dashIndex + 1), 10);
  }
  return 0;
};
