import { describe, it, expect } from "@jest/globals";
import { CARGO_ID_PREFIX, fromCargoId, toCargoId, getCargoInstanceIndex } from "../cargoId";

describe("cargoIdentity", () => {
  const guid = "17169973584497070";

  it("exposes the shared prefix constant", () => {
    expect(CARGO_ID_PREFIX).toBe("cargo-");
  });

  describe("toCargoId", () => {
    it("adds the prefix to a bare GUID", () => {
      expect(toCargoId(guid)).toBe(`cargo-${guid}`);
    });

    it("leaves an already prefixed id unchanged", () => {
      expect(toCargoId(`cargo-${guid}`)).toBe(`cargo-${guid}`);
    });
  });

  describe("fromCargoId", () => {
    it("strips the prefix from a canvas id", () => {
      expect(fromCargoId(`cargo-${guid}`)).toBe(guid);
    });

    it("leaves a bare GUID unchanged", () => {
      expect(fromCargoId(guid)).toBe(guid);
    });

    it("strips prefix and instance suffix (-0, -1, etc.)", () => {
      expect(fromCargoId(`cargo-${guid}-0`)).toBe(guid);
      expect(fromCargoId(`cargo-${guid}-1`)).toBe(guid);
      expect(fromCargoId(`cargo-${guid}-99`)).toBe(guid);
    });

    it("does not strip suffix if not a number", () => {
      expect(fromCargoId(`cargo-${guid}-abc`)).toBe(`${guid}-abc`);
    });
  });

  describe("getCargoInstanceIndex", () => {
    it("returns 0 for base cargo id without instance suffix", () => {
      expect(getCargoInstanceIndex(`cargo-${guid}`)).toBe(0);
      expect(getCargoInstanceIndex(guid)).toBe(0);
    });

    it("returns instance index for cargo id with suffix", () => {
      expect(getCargoInstanceIndex(`cargo-${guid}-0`)).toBe(0);
      expect(getCargoInstanceIndex(`cargo-${guid}-1`)).toBe(1);
      expect(getCargoInstanceIndex(`cargo-${guid}-5`)).toBe(5);
    });

    it("returns 0 for non-numeric suffix", () => {
      expect(getCargoInstanceIndex(`cargo-${guid}-abc`)).toBe(0);
    });
  });

  it("round-trips ids in both directions", () => {
    expect(fromCargoId(toCargoId(guid))).toBe(guid);
    expect(toCargoId(fromCargoId(`cargo-${guid}`))).toBe(`cargo-${guid}`);
  });
});
