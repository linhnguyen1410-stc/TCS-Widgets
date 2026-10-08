import { describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CargoItem } from "../../../core/types/viewModels/CargoItem";
import type { TruckItem } from "../../../core/types/viewModels/TruckItem";
import { CanvasToolbar } from "../CanvasToolbar";

const makeTruck = (): TruckItem => ({
  id: "truck-1",
  code: "A1",
  truckType: "DryVan",
  maxPayloadKg: 20000,
  axleCount: 2,
  maxLoadMeters: 20,
  x: 0,
  y: 0,
  length: 600,
  width: 300,
  rotation: 0,
});

const makeCargo = (overrides: Partial<CargoItem> = {}): CargoItem => ({
  id: "cargo-GUID-1-0",
  name: "Pallet A",
  type: "pallet",
  color: "#777788",
  isLocked: false,
  x: 0,
  y: 0,
  length: 120,
  width: 80,
  rotation: 0,
  quantity: 1,
  ...overrides,
});

const renderToolbar = (
  overrides: {
    items?: CargoItem[];
    availableCargo?: CargoItem[];
    availableCargoItems?: CargoItem[];
    truck?: TruckItem | null;
    isLoading?: boolean;
    onFinalizeLoad?: (items: CargoItem[]) => Promise<boolean>;
  } = {}
) =>
  render(
    <CanvasToolbar
      items={overrides.items ?? []}
      availableCargo={overrides.availableCargo ?? []}
      availableCargoItems={overrides.availableCargoItems ?? []}
      truck={overrides.truck === undefined ? makeTruck() : overrides.truck}
      scale={{ widthScale: 100, heightScale: 100 }}
      canvasWidth={1200}
      canvasHeight={800}
      setItems={jest.fn()}
      onSavePlan={jest.fn()}
      onLoadPlan={jest.fn()}
      onFinalizeLoad={overrides.onFinalizeLoad}
      isLoading={overrides.isLoading ?? false}
    />
  );

const styleOf = (button: HTMLElement): string => button.getAttribute("style") ?? "";

describe("CanvasToolbar Verify (BR-40/BR-45)", () => {
  it("passes when every unit is placed and the layout is valid inside the truck", () => {
    renderToolbar({
      items: [makeCargo()],
      availableCargo: [makeCargo({ id: "cargo-GUID-1" })],
      availableCargoItems: [],
    });

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(styleOf(screen.getByRole("button", { name: "Verify" }))).toContain("green");
    expect(screen.queryByText(/Placement invalid/i)).toBeNull();
    expect(screen.queryByText(/not placed/i)).toBeNull();
  });

  it("fails with a placement error when all units are placed but cargos overlap", () => {
    renderToolbar({
      items: [makeCargo({ id: "cargo-GUID-1-0", x: 10, y: 10 }), makeCargo({ id: "cargo-GUID-2-0", x: 20, y: 20 })],
      availableCargo: [makeCargo({ id: "cargo-GUID-1" }), makeCargo({ id: "cargo-GUID-2" })],
      availableCargoItems: [],
    });

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(styleOf(screen.getByRole("button", { name: "Verify" }))).toContain("red");
    expect(screen.getByText(/Placement invalid/i).textContent).toContain("OVERLAP");
    expect(screen.queryByText(/not placed/i)).toBeNull();
  });

  it("fails with a remaining-count message when the layout is valid but the list is not empty", () => {
    renderToolbar({
      items: [makeCargo()],
      availableCargo: [makeCargo({ id: "cargo-GUID-1", quantity: 2 })],
      availableCargoItems: [makeCargo({ id: "cargo-GUID-1-1", quantity: 1 })],
    });

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(styleOf(screen.getByRole("button", { name: "Verify" }))).toContain("red");
    expect(screen.getByText(/Remaining .*not placed/i).textContent).toContain("1 unit(s) not placed");
    expect(screen.queryByText(/Placement invalid/i)).toBeNull();
  });

  it("lists each validation error kind only once even with several overlapping cargos and LM exceeded", () => {
    renderToolbar({
      items: [
        makeCargo({ id: "cargo-GUID-1-0", x: 10, y: 10 }),
        makeCargo({ id: "cargo-GUID-2-0", x: 15, y: 15 }),
        makeCargo({ id: "cargo-GUID-3-0", x: 20, y: 20 }),
      ],
      availableCargo: [
        makeCargo({ id: "cargo-GUID-1" }),
        makeCargo({ id: "cargo-GUID-2" }),
        makeCargo({ id: "cargo-GUID-3" }),
      ],
      availableCargoItems: [],
      truck: { ...makeTruck(), maxLoadMeters: 0.01 },
    });

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    const message = screen.getByText(/Placement invalid/i).textContent ?? "";
    // validateAll emits one OVERLAP per affected item (3 here); the message must dedupe.
    expect(message.match(/OVERLAP/g)).toHaveLength(1);
    expect(message).toContain("LM_EXCEEDED");
  });
});

describe("Verify finalize chain (BR-47)", () => {
  // The standard passing-Verify fixture: one placed unit, list empty, valid layout.
  const passingFixture = {
    items: [makeCargo()],
    availableCargo: [makeCargo({ id: "cargo-GUID-1" })],
    availableCargoItems: [],
  };

  it("does not finalize when Verify fails", () => {
    const onFinalizeLoad = jest.fn<(items: CargoItem[]) => Promise<boolean>>();
    renderToolbar({
      items: [makeCargo({ id: "cargo-GUID-1-0", x: 10, y: 10 }), makeCargo({ id: "cargo-GUID-2-0", x: 20, y: 20 })],
      availableCargo: [makeCargo({ id: "cargo-GUID-1" }), makeCargo({ id: "cargo-GUID-2" })],
      availableCargoItems: [],
      onFinalizeLoad,
    });

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(styleOf(screen.getByRole("button", { name: "Verify" }))).toContain("red");
    expect(onFinalizeLoad).not.toHaveBeenCalled();
    expect(screen.queryByText(/Loading completed/i)).toBeNull();
  });

  it("finalizes after a successful Verify and shows the completion message", async () => {
    const onFinalizeLoad = jest.fn<(items: CargoItem[]) => Promise<boolean>>().mockResolvedValue(true);
    renderToolbar({ ...passingFixture, onFinalizeLoad });

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByText(/Loading completed/i)).toBeTruthy();
    expect(onFinalizeLoad).toHaveBeenCalledTimes(1);
    // The chain receives the current canvas items, not a stale snapshot.
    expect(onFinalizeLoad).toHaveBeenCalledWith([expect.objectContaining({ id: "cargo-GUID-1-0" })]);
  });

  it("shows no completion message when the finalize chain fails", async () => {
    const onFinalizeLoad = jest.fn<(items: CargoItem[]) => Promise<boolean>>().mockResolvedValue(false);
    renderToolbar({ ...passingFixture, onFinalizeLoad });

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(onFinalizeLoad).toHaveBeenCalledTimes(1));

    expect(screen.queryByText(/Loading completed/i)).toBeNull();
  });

  it("keeps plain Verify behaviour when no finalize callback is wired", () => {
    renderToolbar(passingFixture);

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(styleOf(screen.getByRole("button", { name: "Verify" }))).toContain("green");
    expect(screen.queryByText(/Loading completed/i)).toBeNull();
  });

  it("disables the action buttons while the chain is running and re-enables after", async () => {
    let resolveFinalize: (ok: boolean) => void = () => {};
    const onFinalizeLoad = jest.fn<(items: CargoItem[]) => Promise<boolean>>().mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveFinalize = resolve;
        })
    );
    renderToolbar({ ...passingFixture, onFinalizeLoad });

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect((screen.getByRole("button", { name: "Save Plan" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Auto Load" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Verify" }) as HTMLButtonElement).disabled).toBe(true);

    await act(async () => {
      resolveFinalize(true);
    });
    expect(await screen.findByText(/Loading completed/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Save Plan" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
