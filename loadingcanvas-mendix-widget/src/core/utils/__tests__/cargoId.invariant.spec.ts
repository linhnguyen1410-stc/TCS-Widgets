import { describe, expect, it } from "@jest/globals";
import { fromCargoId, getCargoInstanceIndex, makeInstanceId, toCargoId } from "../cargoId";

// Invariant spec (template 16-§16.3-a): locks id arithmetic so feature growth
// cannot reintroduce T1 (bare vs suffixed instance ids).
describe("cargoId invariants", () => {
  it("toCargoId is idempotent", () => {
    expect(toCargoId(toCargoId("G"))).toBe(toCargoId("G"));
  });

  it("makeInstanceId is the single canonical producer (prefix + index)", () => {
    expect(makeInstanceId("G", 0)).toBe("cargo-G-0");
    expect(makeInstanceId("cargo-G", 3)).toBe("cargo-G-3");
    expect(makeInstanceId(toCargoId("G"), 0)).toBe(makeInstanceId("G", 0));
  });

  it("makeInstanceId output round-trips and parses back", () => {
    const id = makeInstanceId("G", 2);
    expect(fromCargoId(id)).toBe("G");
    expect(getCargoInstanceIndex(id)).toBe(2);
  });

  it("round-trips a bare GUID through prefix + strip", () => {
    const guid = "17169973584497070";
    expect(fromCargoId(toCargoId(guid))).toBe(guid);
  });

  it("strips only the LAST numeric suffix, keeping dashed ids intact", () => {
    expect(fromCargoId("cargo-mock-order-abc-7")).toBe("mock-order-abc");
    expect(getCargoInstanceIndex("cargo-mock-order-abc-7")).toBe(7);
  });

  it("defaults instance index to 0 when no numeric suffix is present", () => {
    expect(getCargoInstanceIndex("cargo-G")).toBe(0);
    expect(getCargoInstanceIndex("plain")).toBe(0);
  });

  it("produces distinct ids for distinct instances of the same order", () => {
    const ids = [0, 1, 2].map((i) => `${toCargoId("G")}-${i}`);
    expect(new Set(ids).size).toBe(3);
    expect(ids.map((id) => getCargoInstanceIndex(id))).toEqual([0, 1, 2]);
    expect(ids.map((id) => fromCargoId(id)).every((base) => base === "G")).toBe(true);
  });
});
