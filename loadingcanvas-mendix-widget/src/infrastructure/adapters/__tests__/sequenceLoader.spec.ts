import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { loadOrderSequenceByOrderGuid } from "../sequenceLoader";

const makeMxObject = (attrs: Record<string, unknown>, guid: string) => ({
  getGuid: (): string => guid,
  get: (name: string): unknown => (name in attrs ? attrs[name] : null),
  set: jest.fn(),
  getAttributes: (): string[] => Object.keys(attrs),
});

// Stubs mx.data.get for both the single-guid and batch forms used by the loaders.
const stubMx = (byGuid: Record<string, unknown>): void => {
  const mxData = {
    get: jest.fn((options: { guid?: string; guids?: string[]; callback: (result: unknown) => void }) => {
      if (options.guid) {
        options.callback(byGuid[options.guid] ?? null);
        return;
      }
      options.callback((options.guids ?? []).map((guid) => byGuid[guid]).filter((obj) => obj !== undefined));
    }),
  };
  (globalThis as { mx?: unknown }).mx = { data: mxData };
};

describe("loadOrderSequenceByOrderGuid", () => {
  const originalMx = (globalThis as { mx?: unknown }).mx;

  afterEach(() => {
    (globalThis as { mx?: unknown }).mx = originalMx;
  });

  it("maps each linked TransportOrder to its OrderSequence", async () => {
    stubMx({
      "ts-1": makeMxObject({ TransportOrderSequence_TruckSelection: ["seq-a", "seq-b"] }, "ts-1"),
      "seq-a": makeMxObject({ OrderSequence: 1, TransportOrderSequence_TransportOrder: ["order-1"] }, "seq-a"),
      "seq-b": makeMxObject({ OrderSequence: 2, TransportOrderSequence_TransportOrder: ["order-2"] }, "seq-b"),
    });

    const result = await loadOrderSequenceByOrderGuid("ts-1");

    expect(result.get("order-1")).toBe(1);
    expect(result.get("order-2")).toBe(2);
  });

  it("keeps the lowest sequence when an order appears in several sequences", async () => {
    stubMx({
      "ts-1": makeMxObject({ TransportOrderSequence_TruckSelection: ["seq-a", "seq-b"] }, "ts-1"),
      "seq-a": makeMxObject({ OrderSequence: 3, TransportOrderSequence_TransportOrder: ["order-1"] }, "seq-a"),
      "seq-b": makeMxObject({ OrderSequence: 1, TransportOrderSequence_TransportOrder: ["order-1"] }, "seq-b"),
    });

    const result = await loadOrderSequenceByOrderGuid("ts-1");

    expect(result.get("order-1")).toBe(1);
  });

  it("skips sequences whose OrderSequence is not numeric", async () => {
    stubMx({
      "ts-1": makeMxObject({ TransportOrderSequence_TruckSelection: ["seq-a", "seq-b"] }, "ts-1"),
      "seq-a": makeMxObject({ OrderSequence: 1, TransportOrderSequence_TransportOrder: ["order-1"] }, "seq-a"),
      "seq-b": makeMxObject({ TransportOrderSequence_TransportOrder: ["order-2"] }, "seq-b"),
    });

    const result = await loadOrderSequenceByOrderGuid("ts-1");

    expect(result.get("order-1")).toBe(1);
    expect(result.has("order-2")).toBe(false);
  });

  it("reads the prefix-less fallback association names", async () => {
    // Only the fallback (prefix-less) names are present, so the prefixed candidates
    // must be tried and rejected before the fallback resolves.
    stubMx({
      "ts-1": makeMxObject({ TransportOrderSequence_TruckSelection: ["seq-a"] }, "ts-1"),
      "seq-a": makeMxObject({ OrderSequence: 2, TransportOrderSequence_TransportOrder: ["order-1"] }, "seq-a"),
    });

    const result = await loadOrderSequenceByOrderGuid("ts-1");

    expect(result.get("order-1")).toBe(2);
  });

  it("returns an empty map when the TruckSelection has no sequence", async () => {
    stubMx({ "ts-1": makeMxObject({}, "ts-1") });

    const result = await loadOrderSequenceByOrderGuid("ts-1");

    expect(result.size).toBe(0);
  });

  it("returns an empty map for a missing truck selection guid", async () => {
    stubMx({});

    await expect(loadOrderSequenceByOrderGuid(null)).resolves.toEqual(new Map());
    await expect(loadOrderSequenceByOrderGuid("")).resolves.toEqual(new Map());
  });

  it("returns an empty map in the dev fallback (no Mendix runtime)", async () => {
    (globalThis as { mx?: unknown }).mx = undefined;

    const result = await loadOrderSequenceByOrderGuid("ts-1");

    expect(result.size).toBe(0);
  });
});
