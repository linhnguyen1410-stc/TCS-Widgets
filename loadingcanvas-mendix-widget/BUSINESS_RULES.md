# Business Rules — LoadingCanvas Widget

This document describes the **business rules** of the LoadingCanvas widget: the behavioral contract that governs truck loading and packing planning. It states _what_ the system enforces, not _how_ it is implemented. Technical design lives in `ARCHITECTURE.md`; the persistence entity design lives in [docs/MENDIX_ENTITY.md](docs/MENDIX_ENTITY.md).

The architecture follows a **Pragmatic Domain-Centric Architecture** where business rules are implemented in the Domain layer (`src/domain/`). This separation ensures business logic is framework-agnostic and fully testable.

All measurements use metric units: meters for length/width/height, kilograms for weight.

---

## 1. Purpose & Scope

LoadingCanvas is an interactive, two-dimensional top-view planner for loading cargo onto a truck. A planner selects a truck, receives the cargo belonging to the selected transport orders, arranges the cargo inside the truck, and saves the resulting arrangement as a single packing plan.

These rules cover: trucks, cargo, placement, capacity, positioning, collision handling, automatic packing, user interaction, plan persistence, verification, and status display.

---

## 2. Glossary

| Term                       | Meaning                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Truck (TruckSelection)** | The vehicle being loaded; defines the usable interior space and limits.                                  |
| **Transport Order**        | A shipping order that supplies cargo to the planner.                                                     |
| **Packing Unit**           | The physical unit (pallet or box) belonging to a transport order; defines footprint, height, and weight. |
| **Cargo Item**             | A packing unit as represented on the planning canvas.                                                    |
| **Packing Plan**           | The single saved arrangement of cargo for one truck selection.                                           |
| **Plan Item**              | One stored cargo placement inside a packing plan.                                                        |
| **Load Meter (LM)**        | Linear meters of truck length occupied by cargo.                                                         |
| **Canvas**                 | The interactive 2-D top-view surface on which cargo is arranged.                                         |

---

## 3. Truck Rules

- **BR-01** — Exactly one truck is planned at a time; it is identified by its truck selection.
- **BR-02** — The usable loading space is the truck's interior: internal length × internal width × internal height.
- **BR-03** — When truck data is missing or incomplete, default values apply: 13.6 m length, 2.45 m width, 2.7 m height, 24,000 kg maximum payload, 2 axles.
- **BR-04** — The maximum load meters defaults to the truck's internal length when not explicitly configured.
- **BR-05** — A truck is classified as one of: DryVan (default), Reefer, Flatbed, Container, or Curtainsider.

---

## 4. Cargo & Transport Order Rules

- **BR-06** — Every cargo item originates from exactly one transport order, and each transport order contributes exactly one packing unit.
- **BR-07** — Cargo comes in two types: **pallet** or **box**.
- **BR-08** — Cargo is color-coded on screen: orange = pallet, blue = box.
- **BR-09** — When cargo dimensions are missing or invalid, defaults apply: 1.2 m length × 0.8 m width footprint, 1.6 m height, 500 kg weight.
- **BR-10** — The available-cargo list shows only cargo that is **not** currently placed on the canvas. Placing cargo removes it from the list; removing it from the canvas returns it to the list.
- **BR-10a** — A transport order's cargo can be removed from the canvas by the user; all cargo items belonging to that transport order are removed simultaneously and returned to the available-cargo list.

---

## 5. Placement Rules

- **BR-11** — A cargo item must lie **entirely inside** the truck's interior boundary. Items partially outside the truck are invalid.
- **BR-12** — Cargo items must **never overlap** one another. Touching edges are allowed.
- **BR-13** — Items may only be rotated in **90° steps**: 0°, 90°, 180°, or 270° (clockwise).
- **BR-14** — Rotating an item keeps it centered on its current position; the rotated footprint is clamped back inside the widget canvas so the item stays grabbable; after rotation the item is kept at a valid position.
- **BR-15** — A locked item cannot be rotated (and cannot be moved).
- **BR-16** — Real-world proportions are preserved on screen: a rotated rectangular item remains a rectangle of the correct shape.

---

## 6. Capacity Rules

- **BR-17** — The total load meters occupied by cargo along the truck's length must not exceed the truck's maximum load meters. Load meters are measured from the truck frame's left edge (the loading-area front, `truck.x`); cargo parked before the frame does not count. Exceeding the limit is reported as a violation (`LM_EXCEEDED`).
- **BR-18** — Each cargo item's weight is carried with the plan data. The truck's maximum payload limit is recorded but is **not currently enforced** by the planner (known gap; only load meters are validated).

---

## 7. Positioning & Alignment Rules

- **BR-19** — Positions align to a fixed square grid so placements are tidy and repeatable. Grid alignment is disabled when no grid is configured.
- **BR-20** — While moving an item, snapping is applied in priority order:
  1. Flush against the **truck walls** (boundary),
  2. **Touching an edge** of a neighboring item,
  3. **Edge-aligned** with a neighboring item,
  4. Otherwise the **plain grid**, as fallback.

  Snapping only engages within a small activation distance of the target.

---

## 8. Collision Handling Rules

- **BR-21** — In guarded placement (collision resolution active; see BR-46), when a moved item would land on an occupied or out-of-bounds spot, the system resolves it in this order:
  1. Use the requested position if it is free and inside the truck;
  2. Otherwise move it to the **nearest valid free position**;
  3. Otherwise slide only **along the length axis**;
  4. Otherwise slide only **along the width axis**;
  5. Otherwise **return the item to where the drag started**.
- **BR-22** — In guarded placement, after any move or rotation, an item is either at a valid non-overlapping position inside the truck, or back at its previous valid position. An item is never left overlapping or outside.
- **BR-46** — Manual placement runs in **free placement**: dragging, dropping, moving and rotating cargo may place it on an occupied spot and park it anywhere on the widget canvas, inside or outside the truck. Interaction-time feedback therefore only reports load-meter violations (BR-17) and items escaping the widget canvas (BR-30b); the overlap and truck-band checks are enforced by the explicit **Verify** action (BR-45) and by automatic packing (BR-23 to BR-27).

---

## 9. Auto Load (Automatic Packing) Rules

- **BR-23** — Auto Load repacks **all** cargo into the truck: both cargo already on the canvas and cargo still in the available-cargo list. A 13.6 LM × 2.45 m tautliner frame holds **34 EUR pallets** in the widget's geometric model (2 rotated lanes × 17 columns at exactly 13.6 LM; a 33-pallet load keeps the upright 3-lane × 11-column layout). Industry practice loads 33 due to physical pallet tolerances — the model has no gaps. Capacity is pinned by the tautliner capacity spec in `src/domain/packing/__tests__/auto-load.integration.spec.ts`.
- **BR-24** — Auto Load maximizes the **number of loaded packing units** first; among layouts that load the same number of units, it keeps **larger cargo nearer the loading front** (area-weighted front bias — groundwork for a future weight-distribution check), then minimizes the **used load meters** (BR-17), then used width, then the number of 90° turns (upright preference, BR-26). When the TruckSelection has a **TransportOrderSequence**, the planned loading order (`OrderSequence`) is applied on top as a **slot assignment**: the geometry decides where the slots are, and the cabin-most slots (smallest X, then Y) go to the units in sequence order, so transport order 1 sits nearest the cabin, order 2 next, and so on; units without a sequence keep the solver's assignment. The assignment only permutes interchangeable (identical-footprint) units, so it never changes the placed count, the span, the overlaps or the load meters.
- **BR-25** — Placement fills from the **top-left corner**, extending along the loading front before stacking lanes, and items sit **flush edge-to-edge** with no gaps and no overlaps inside a stack. Small/medium loads are solved to the front-weighted optimal layout; larger loads use a deterministic left-anchored skyline fill (tried in both orientation orders) that approximates it. Partial columns load **walls-inward**: they hug both side walls (canvas top and bottom = both trailer walls) before filling the middle lane, so the load never clings to one side.
- **BR-26** — During automatic packing, items may be turned by up to 90° to fit; when both orientations load the **same number of units**, the upright (0°) orientation is preferred (the skyline also tries a rotated-first pass and keeps it only when it places strictly more units).
- **BR-27** — Cargo that does not fit anywhere **remains in the available-cargo list**, and the user is told how many items did not fit.

---

## 10. Interaction & Selection Rules

- **BR-28** — Pressing an item starts interacting with it and makes it the active selection; pressing empty canvas space clears the selection.
- **BR-29** — Several items can be selected and dragged **together** as a group. Starting a drag on an item that is not part of the current selection restricts the drag to that single item.
- **BR-30** — Cargo enters the canvas at the **drop point** when dragged from the list, or at a default position when added by clicking it in the list.
- **BR-30a** — Dragging a placed cargo unit from the canvas back onto the available-cargo list returns **that unit** to the list; other placed units of the same transport order remain on the canvas.
- **BR-30b** — A dropped cargo unit is always kept fully inside the visible widget canvas so it can always be selected and dragged again, regardless of where over the widget it was released.
- **BR-30c** — A cargo unit added by clicking (no drop point) lands on the nearest free truck spot when space remains; when the truck is full it is parked at the widget canvas' top-left margin (16 px), outside the truck — always visible and selectable, flagged as out-of-bounds.
- **BR-31** — Until the initial data (truck, cargo, saved plan) has finished loading, the planner shows a loading state instead of an editable canvas.

---

## 11. Packing Plan Persistence Rules

- **BR-32** — There is **exactly one** saved packing plan per truck selection. Plans are not versioned.
- **BR-33** — Saving **replaces** the previously saved arrangement completely: all stored item placements of the plan are replaced with the current canvas arrangement.
- **BR-34** — A plan stores, for every cargo item: which **transport order** it belongs to, its **position**, its **footprint** (length × width), its **rotation**, and its **color/type**.
- **BR-35** — Stored positions and dimensions are in **meters, measured from the truck's interior origin** (top-left corner of the truck interior), independent of screen zoom or scale.
- **BR-36** — Planning is two-dimensional: item height is always stored as **zero** (no Z axis).
- **BR-37** — The saved plan is **loaded automatically when the page opens**; the canvas starts from the saved arrangement. If no plan exists, the canvas starts empty.
- **BR-38** — "Load Plan" **never discards unsaved work**: if no saved plan exists, the current canvas content is kept unchanged.
- **BR-39** — An optional follow-up action (configured microflow) runs **after** the plan has been successfully saved; it does not run when saving failed.
- **Remark** — Persisting plans requires running inside the Mendix application runtime. Outside of it (local development/testing), saving produces no persistent effect.

---

## 12. Verification Rules

- **BR-40** — The loading exercise counts as **complete** only when the cargo of **every** provided transport order has been placed on the truck — i.e., the available-cargo list has been emptied onto the canvas.
- **BR-41** — Any change to the number of items on the canvas **invalidates** a previous verification result.
- **BR-45** — The **Verify** action passes **only** when the load is complete per BR-40 **and** every placed cargo is geometrically valid inside the truck — no overlaps, fully within bounds, and load meters not exceeded. Any validation failure is reported and fails the verification.
- **BR-47** — The Verify-finalize chain: **only** an explicit Verify click with a passing result (BR-45) may (1) save the PackingPlan and then (2) set `CompleteLoading = true` on the TruckSelection. The flag is written **only after** the plan has been persisted; if the save or the flag write fails, the error is shown and the flag is never set. A failed flag write self-heals on the next successful Verify (the plan save is replace-per BR-33). Auto Load never triggers the chain. The widget writes `true` only — clearing the flag is outside this chain.

---

## 13. Status Display Rules

- **BR-42** — Card borders communicate state:

  | State                                       | Border              |
  | ------------------------------------------- | ------------------- |
  | Normal                                      | gray                |
  | Selected                                    | blue                |
  | Being dragged (active)                      | red                 |
  | Invalid placement (overlap / out of bounds) | red error highlight |

- **BR-43** — After Auto Load, the planner reports how many items did not fit, if any.
- **BR-44** — A grid overlay is drawn on the canvas as visual guidance matching the snap grid.
