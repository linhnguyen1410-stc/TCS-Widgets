# Bug Log

Defects are recorded as `### B-####` blocks: symptom, root cause, fix, regression spec, lesson.
Debt (known compromises, not bugs) goes in `DEBT.md` — never shared rows.

| # | Area | Pattern | Severity | Status |
|---|------|---------|----------|--------|
| B-0001 | manifest / offline | T4 contract | P1 | FIXED 2026-09-14 (ADR-0001) |
| B-0002 | planRepository save | T4 contract | P1 | FIXED 2026-09-14 |
| B-0003 | container save | T2 silent | P2 | FIXED 2026-09-14 |
| B-0004 | SnapEngine | T3 priority | P2 | FIXED 2026-09-14 |
| B-0005 | plan load / ids | T1 identity | P1 | FIXED 2026-09-14 |
| B-0006 | LoadingCanvasView | T5 dead/perf | P3 | FIXED 2026-09-14 |
| B-0007 | plan load / removed order | T1 identity | P1 | FIXED 2026-09-18 |
| B-0008 | cargo list empty state drop | T2 silent | P1 | FIXED 2026-09-18 |
| B-0009 | canvas drag/drop lands away from mouse | T2 coordinate | P1 | FIXED 2026-09-22 |
| B-0010 | list↔canvas pointer drag dead | T5 wiring | P1 | FIXED 2026-09-23 |
| B-0011 | pointer gesture stuck / list hit-test miss | T5 lifecycle | P1 | FIXED 2026-09-23 |
| B-0012 | bubbled mousedown DESELECT race | T2 state race | P1 | FIXED 2026-09-23 |
| B-0013 | cargo list chip tooltip | T2 layout clip | P2 | FIXED 2026-09-24 |
| B-0014 | canvas card stacking (drag) | T2 paint order | P2 | FIXED 2026-09-24 |
| B-0015 | dispatcher ROTATE contract | T2 state contract | P1 | FIXED 2026-10-05 |
| B-0016 | test suite drift (19 red tests) | T4 contract | P2 | FIXED 2026-10-05 |
| B-0017 | Truck technical data gaps (hangerLength 0, duplicate flags) | T4 contract | P3 | REPORTED 2026-10-07 |

---

### B-0001 · manifest/offline · T4 · P1 · FIXED 2026-09-14
- Symptom: `offlineCapable="true"` while plan/cargo loads use `mx.data.get({xpath})`
  → offline apps would fail at runtime (XPath unsupported offline, verified Mendix 10 docs).
- Root cause: manifest copy-paste default; no offline enforcement rule.
- Fix: `src/LoadingCanvas.xml` → `offlineCapable="false"` (see `docs/adr/0001-offline-capable.md`).
- Regression spec: none automated (a manifest is not executable); covered by the XML
  review gate and the rationale in `docs/adr/0001-offline-capable.md`.
- BR: BR-37/BR-38 (load flow stays online).
- Lesson: XPath/microflow loads must keep `offlineCapable="false"`.

### B-0002 · planRepository save · T4 · P1 · FIXED 2026-09-14
- Symptom: `PackingPlan.CreatedDate/ModifiedDate` required per docs but never written
  → server-side constraint/validation risk on save.
- Root cause: the required-attribute table was not enforced in the `create()` path.
- Fix: `src/infrastructure/adapters/planRepository.ts` — `setDateAttribute` on
  create (Created+Modified) and on every save (Modified); plan header now in commit batch.
- Regression spec: `src/infrastructure/adapters/__tests__/planRepository.requiredDates.spec.ts`.
- Lesson: every required attribute on an entity must be written by the save flow and
  covered by a required-attribute regression spec.

### B-0003 · container save · T2 · P2 · FIXED 2026-09-14
- Symptom: clicking Save with no truckGuid silently did nothing.
- Root cause: early return without message in `handleSavePlan`.
- Fix: `src/presentation/widget/LoadingCanvas.container.tsx` → sets `saveError`
  "No truck selected — cannot save the packing plan."
- Regression spec: none (UI path); covered by the visibility contract review (see BR-41).
- Lesson: user-triggered handlers never end in a silent early return.

### B-0004 · SnapEngine · T3 priority · P2 · FIXED 2026-09-14
- Symptom: comment promised "boundary > edge > align > grid" but implementation
  picked the closest candidate regardless of type; grid/edge could beat boundary.
- Root cause: `findBestCandidate` minimized distance, not tiered priority.
- Fix: `pickByTier` in `src/domain/engines/SnapEngine.ts` — closest candidate of the
  HIGHEST tier with any candidate within threshold
- Regression spec: `src/domain/engines/__tests__/SnapEngine.spec.ts` ("snap priority order" describe — boundary beats a CLOSER edge; grid never overrides boundary; edge beats align at tie)
- Lesson: any stated rule ORDER needs a spec that asserts the first rule wins.

### B-0005 · plan load ids · T1 identity · P1 · FIXED 2026-09-14
- Symptom: `loadPackingPlan` rebuilt ids by occurrence (`cargo-G`, `cargo-G-1`)
  while the canvas generated `cargo-G-0`; after load+add, `placedInstances` counts drift.
- Root cause: second id producer (suffixing by occurrence) outside `cargoId.ts`.
- Fix: `makeInstanceId(base, index)` added to `src/core/utils/cargoId.ts` as the
  single producer; used by plan load (planRepository), CargoList chips (drag data +
  click-add), View legacy bulk drop, and packingRules (expand + autoLoad).
- Regression spec: `src/core/utils/__tests__/cargoId.invariant.spec.ts`
  (+ `mendixDataAdapter.spec.ts` load ids updated to canonical `cargo-G-0` form).
- Lesson: instance ids come from exactly one module; any `-${i}` outside it is a bug.

### B-0006 · LoadingCanvasView · T5 · P3 · FIXED 2026-09-14
- Symptom: 16-line commented debug panel in the View; `CargoList` re-render wasteful.
- Root cause: leftover debug code; no dead-code gate.
- Fix: commented info-panel block deleted from LoadingCanvasView.tsx.
- Regression spec: `src/presentation/hooks/__tests__/useTruckCanvas.spec.tsx` (renders View; ensures no dead code renders)
- Lesson: commented-out UI blocks > 5 lines are deleted or linked to an issue.

### B-0007 · plan load / removed order · T1 identity · P1 · FIXED 2026-09-18
- Symptom: dragging an order's cargos to the truck and saving the plan, then removing
  the order from the TruckSelection in Mendix and reopening the widget, still showed the
  removed order's cargos on the canvas (the saved plan stored them) while they correctly
  left the cargo list.
- Root cause: `loadPackingPlan` restored every saved `PackingPlanItem` unconditionally;
  rows for a removed order were never filtered against the truck's current order set.
- Fix: `loadPackingPlan(truckGuid, scale, validTransportOrderGuids?)` drops restored
  items whose resolved TransportOrder GUID is not in the current TruckSelection set
  (compared via `toCargoId` on the pre-prefix GUID); omitting the arg keeps the old
  no-filter behavior. The container passes `transportOrderGuids` on initial load and
  on Load Plan. Stale rows are removed on the next Save (BR-33 delete + recreate).
- Regression spec: `src/infrastructure/mendix/__tests__/mendixDataAdapter.spec.ts`
  (does not restore removed-order item; no-filter still restores everything).
- Lesson: restored plan items must be filtered against the datasource's *current*
  association set, not just what was persisted.

### B-0009 · canvas drag/drop lands away from mouse · T2 coordinate · P1 · FIXED 2026-09-22
- Symptom: clicking a cargo card mid-card, dragging, and dropping placed the card
  with its top-left at the cursor (jump up to a full card size) instead of under
  the mouse; the live custom-drag preview and the final native-drop position also
  disagreed, worst near canvas edges.
- Root cause: two competing gestures — `mousedown` started the custom
  `DragEngine` drag (grab-preserving) while the browser threshold also started a
  native HTML5 drag; `cancelDrag` only hid custom listeners without
  `controller.endDrag()`, so the native `drop` won and `getDropDataPoint`
  placed card top-left at the cursor (no grab anchor, no collision resolve via
  raw `SET_ITEMS`). The custom path additionally fed raw rendered coords into a
  data-space clamp, shifting edge behavior by `sceneOffset`.
- Fix: native payload now carries the grab offset
  (`single:<id>:<grabX>:<grabY>`, back-compatible with bare `single:<id>`);
  `getDropDataPoint(..., anchor)` subtracts it before clamping; existing-card
  drops settle via the new collision-aware `MOVE_ITEM` dispatcher action
  (clears `activeId`); card mouse/pointer gestures convert once at the hook
  boundary (`getCanvasPoint` → `toDataPoint`, `R - S`) and re-apply the grab on
  move; `cancelDrag` fully ends the engine gesture.
- Regression spec: `src/presentation/hooks/__tests__/coordinateRule.spec.ts`
  (center- vs corner-grab differs by grab delta; anchored edge clamp;
  `toDataPoint`/`isPointInRect`), `src/state/__tests__/CanvasActionDispatcher.spec.ts`
  (`MOVE_ITEM` free move / occupied resolve / unknown id),
  `src/presentation/components/__tests__/CargoCard.spec.tsx` (payload carries id + grab).
- Lesson: one gesture owns drop math — every entry point must preserve the grab
  point and settle through the collision-aware path, never raw top-left placement.

### B-0008 · cargo list empty state drop · T2 silent · P1 · FIXED 2026-09-18
- Symptom: after clicking Auto Load, every cargo is placed, so the cargo list renders its
  empty state; dragging a placed pallet from the truck canvas back onto the cargo list no
  longer returned it to the list.
- Root cause: `CargoList` only bound `onDragOver`/`onDrop` on its populated panel. The
  empty-state div had no drop handlers, so the drop bubbled to the canvas `handlePalletDrop`,
  which treated the already-placed instance as a re-position and moved it within the truck
  instead of returning it to the list.
- Fix: `CargoList` empty state now binds the same `onDragOver`/`onDrop` (calls
  `onRemoveCargo`) and keeps a stable one-row drop footprint (min-width plus one populated
  row height, 48px), so a canvas card dropped there is returned to the list even when
  no unplaced items remain.
- Regression spec: `src/presentation/components/__tests__/CargoList.spec.tsx` ("empty state
  is still a drop zone") asserts `onRemoveCargo` fires with the full instance id and the
  parent/canvas drop handler is NOT invoked.
- Lesson: any state a drop must land on and *stop* must keep its drop handlers in every
  render branch; a minimal-empty-state layout otherwise redirects drags to the enclosing zone.

### B-0010 · list↔canvas pointer drag dead · T5 wiring · P1 · FIXED 2026-09-23
- Symptom: after CH-0024's unified pointer gesture, dragging a chip from the cargo list
  onto the truck canvas did nothing, and dragging a placed card back onto the list did
  not return it. Click-to-add still worked.
- Root cause: composition wiring never connected the gesture halves —
  `LoadingCanvasView` never passed `onPointerDragStart` to `CargoList` (so
  `pendingAddRef` was never set and move/up handlers bailed) and never passed
  `panelRef={listPanelRef}` (so the `isPointInRect` list hit-test was always false).
  Three latent defects surfaced with the wiring: cards still ran a parallel
  `onMouseDown` + `onPointerDown` start; drag-add sent the base cargo id (collision
  with click-add instance ids); and the pointer-capture retargeted trailing `click`
  would have double-added after every drag.
- Fix: wire `onPointerDragStart`/`panelRef`/`shouldSuppressClick` in the view; delete
  the duplicate mouse path (`handleMouseDown`, `CargoCard.onMouseDown`); drag-add now
  uses `makeInstanceId(cargo.id, instanceIndex)`; a 4px move threshold sets
  `suppressClickRef`, the chip `onClick` checks `shouldSuppressClick()`, and
  `handlePointerUp` clears suppression via `setTimeout(0)`; dropping a card on the
  list now `endDrag()`s before `removeItem(activeId)`.
- Regression spec: `src/presentation/components/__tests__/CargoList.spec.tsx`
  ("suppresses the trailing chip click after a real drag"),
  `src/presentation/components/__tests__/CargoCard.spec.tsx` (pointer-only card).
- Lesson: a ref/callback that is only *accepted* by a child but never *passed* by the
  parent fails silently — grep the composition root, not just the hook, before claiming
  a gesture works.

### B-0011 · pointer gesture stuck / list hit-test miss · T5 lifecycle · P1 · FIXED 2026-09-23
- Symptom: (1) dragging a placed card from the truck onto the cargo list never returned
  it; (2) after one successful list→truck drag-drop, neither cards nor chips could be
  dragged anymore — every gesture was dead until reload.
- Root cause: two independent defects. (a) `handlePointerUp` cleared `pendingAddRef` /
  `downPosRef` only at the end of the happy path (no `finally`) and there was no
  `pointercancel` handler, so one skipped cleanup left `pendingAddRef` set forever; the
  pointerdown guards (`dragging || pendingAddRef.current`) then early-returned for every
  subsequent card *and* chip — bricking both directions. Control flow also read the
  `dragging` React state through memoized children closures (stale). (b) `CargoList`
  binds `panelRef` only on the populated panel div; when `expandedItems` is empty (the
  common case right after placing the last cargo) the empty-state branch rendered with
  no ref → `listPanelRef.current` null/detached → `isPointInRect` always false →
  drops fell through to `finish()` and the card stayed on the canvas.
- Fix: gesture cleanup moved into `finally`; added `handlePointerCancel`/`cancelGesture`
  (bound via `onPointerCancel` on the canvas); a new pointerdown now *cancels* a stale
  pending gesture instead of refusing to start; guards/branches read `draggingRef` (ref
  twin set by `setGestureActive`) instead of render state; `onPointerUp` ownership is
  the canvas container alone (removed from `CargoCard`/`CargoList` — bubbling delivers
  it, memoized stale child handlers are then irrelevant); a shared `setPanelRef`
  callback binds both the panel div and the empty-state div to the external
  `panelRef`; hook default params became module-scope constants
  (`DEFAULT_SCALE`/`DEFAULT_SCENE_OFFSET`) because a fresh object literal per render
  re-keyed the controller `useMemo` → resubscribe → `setState` loop
  ("Maximum update depth exceeded").
- Regression spec: `src/presentation/hooks/__tests__/useTruckCanvas.spec.tsx`
  ("adds a chip by drag, then a card drag still moves (no stuck gesture)", plus
  pointercancel recovery); `src/presentation/components/__tests__/CargoList.spec.tsx`
  (empty state exposes `panelRef`).
- Lesson: gesture state cleanup must be in `finally` + handle `pointercancel`, and a
  leaked "in progress" ref must be recoverable by the next pointerdown — otherwise one
  skip bricks every future gesture; hit-test targets must hold their ref in *every*
  render branch, and gesture control flow must read refs, not render state captured by
  memoized children.

### B-0012 · bubbled mousedown DESELECT race · T2 state race · P1 · FIXED 2026-09-23
- Symptom: dragging a card from the truck canvas onto the cargo list was detected
  (hit-test passed) but the card silently stayed on the canvas — `removeItem` never
  ran; the active/selection border also wiped instantly on press.
- Root cause: `pointerdown.stopPropagation()` does not stop the follow-up native
  `mousedown` — they are independent event streams. Sequence: card `pointerdown` →
  `START_DRAG` sets `activeItemId` → the bubbled `mousedown` reaches the canvas root
  → unconditional `DESELECT` nulls `activeItemId` → `pointerup` over the list enters
  the removal branch but `if (activeId)` is false → `removeItem` skipped.
- Fix: `useTruckCanvas.handleCanvasMouseDown` is background-only — a target inside
  `[data-id]` (a card) or inside `listPanelRef` (a chip) returns early; only empty
  canvas/grid presses dispatch `DESELECT`.
- Regression spec: `src/presentation/hooks/__tests__/useTruckCanvas.spec.tsx`
  ("bubbled mousedown on a card does not DESELECT, so drop on the list removes it
  (B-0012)" + "mousedown on empty canvas still deselects (background press)").
- Lesson: `stopPropagation` on `pointerdown` does not cancel `mousedown` — a
  background action (DESELECT) must verify its target instead of running
  unconditionally after `START_DRAG`.

### B-0013 · cargo list chip tooltip clipped by the scroll container · T2 layout clip · P2 · FIXED 2026-09-24
- Symptom: hovering a chip in a short cargo list (e.g. one row) showed no tooltip at
  all — the tips were hidden.
- Root cause: the tooltip was rendered inside the chip wrapper, i.e. inside the list's
  scroll container (`overflowY: auto` / `overflowX: hidden`), and the flip logic chose
  above/below relative to the PANEL rect. A short list has no room inside the panel in
  either direction, so the scroll container clipped the tooltip on both edges.
- Fix: the tooltip is hoisted out of the scroll container and rendered as a SIBLING of
  the panel (fragment), anchored in canvas coordinates (chipRect − canvasRect) inside a
  wrapper that mirrors the chip's rect, so `CargoTooltip`'s existing CSS anchoring stays
  unchanged; placement now flips against the CANVAS edges (prefer below, else above when
  it fits). No canvas element means no tooltip (production always passes `canvasRef`).
- Regression spec: `src/presentation/components/__tests__/CargoList.spec.tsx`
  ("shows tooltip on mouse over chip, hoisted out of the scroll container",
  "flips a short-list tooltip above the chip when the canvas bottom is near").
- Lesson: an overlay that must overflow its list must not be rendered inside that
  list's scroll container — `overflow` clips absolutely positioned descendants too,
  and flip logic must measure against the clipping boundary (the canvas), not the
  container that clips.

### B-0014 · dragged card painted under settled cargo · T2 paint order · P2 · FIXED 2026-09-24
- Symptom: while dragging a cargo card, the active card sometimes rendered BELOW
  other cards it was dragged over.
- Root cause: cards are absolutely positioned with `z-index: auto`, so paint order
  inside the transformed cards layer is DOM order (`items.map`). `isActive` only
  changed the border, never the stacking — a dragged card that sits earlier in the
  items array is painted first, so later cards cover it.
- Fix: the root card div gets `zIndex: CARD_ACTIVE_Z_INDEX` (20) while active and
  stays `auto` otherwise; `END_DRAG` clears `activeItemId`, so the lift reverts on
  release. Idle-card layering (rotation handle 10, tooltip/popup 1000 inside cards)
  is unchanged.
- Regression spec: `src/presentation/components/__tests__/CargoCard.spec.tsx`
  ("lifts the active (dragged) card above settled cargo (B-0014)",
  "leaves idle cards at the default stacking level").
- Lesson: an element that is the subject of an active gesture must own a z-index —
  DOM order is not a stacking strategy. If multi-select group drag is ever wired up
  (the `SELECT` action has no production caller today), the other selected cards
  need the same lift.

### B-0015 · dispatcher ROTATE contract · T2 · P1 · FIXED 2026-10-05
- Symptom: rotating a card turned locked items, the visual footprint jumped
  (top-left stayed fixed instead of the center, so the item visibly teleported),
  and a rotated item near the canvas edge could extend off-canvas.
- Root cause: the ROTATE case rewrite ("Enhance Mendix data handling and
  validation", commit acfc948) replaced `dragEngine.rotateItem(itemId,
  canvasBounds, scale)` with an inline `rotation + 90` bump and dropped the
  `target.isLocked` guard — losing center re-anchoring, canvas clamping, and
  the locked-item contract in one change.
- Fix: `src/state/CanvasActionDispatcher.ts` ROTATE restores the locked guard
  and delegates to `DragEngine.rotateItem` (center-preserving, canvas-clamped).
- Regression spec: `src/state/__tests__/CanvasActionDispatcher.spec.ts`
  ("should preserve item center during rotation", "should preserve center using
  scale-correct sizes under non-uniform scale", "should not rotate locked items",
  "should keep the rotated item inside the widget canvas") and
  `src/state/__tests__/CanvasController.spec.ts` ("does not rotate a locked item").
- BR: BR-46 (free-placement rotation re-anchors in place and stays canvas-bounded).
- Lesson: a refactor that replaces an engine call with inline logic must rerun the
  engine's contract specs in the same change — five red specs flagged this
  regression immediately, but it shipped anyway because CI never ran (the workflow
  triggered only on `main` while the repo lives on `master`).

### B-0016 · test suite drift (19 red tests across 7 suites) · T4 · P2 · FIXED 2026-10-05
- Symptom: 19 tests failed across 7 suites at HEAD and one suite failed to
  compile; every failure printed `pretty-format: Unknown option "maxWidth"`
  instead of the expected/received diff, hiding the real assertion values.
- Root cause: the data-loading/validation refactor (acfc948/c34969a) changed
  contracts — the truckFrontDataX load-meter offset, the truck band position,
  raw-entry input for `autoLoadCargoUnits`, the orders→units→types mock queue and
  `getGuid` on MxObject mocks — without realigning the sibling specs. Separately,
  jest 29 resolved an incompatible hoisted pretty-format v27 (from
  @testing-library/dom@8) that masked all failure diffs, and
  `data-loading.integration.spec.ts` typed its mock as `jest.fn<() => void>`
  (TS2345 — invisible to `tsc --noEmit` because tsconfig excludes `__tests__`).
- Fix: realigned fixtures with the implemented semantics (validationRules ×6,
  verify-gate ×3, auto-load ×1); rewired Mendix mocks to the current loader
  contract (mendixDataAdapter ×4, data-loading.integration ×2); pinned
  `pretty-format@29.7.0` as a direct devDependency so the root hoist satisfies
  jest 29 and failure diffs print again.
- Regression spec: `src/domain/rules/__tests__/validationRules.spec.ts`,
  `src/domain/rules/__tests__/verify-gate.integration.spec.ts`,
  `src/domain/packing/__tests__/auto-load.integration.spec.ts`,
  `src/infrastructure/mendix/__tests__/mendixDataAdapter.spec.ts`,
  `src/infrastructure/adapters/__tests__/data-loading.integration.spec.ts`.
- BR: none (test-only; these specs guard BR-17/BR-26/BR-45 behaviour).
- Lesson: when a contract changes, every spec touching it must be realigned in
  the same change, and a masked-diff toolchain must be fixed first — otherwise
  failures are undiagnosable and get mistaken for environment noise. Extends the

### B-0017 · truck technical data · T4 · P3 · REPORTED 2026-10-07
- Symptom (found while auditing the NL-TF-02 packing plan via the read-only DB tool,
  no widget error): (a) `datamodelmodule$technicaldetails.hangerlength` and
  `hangerwidth` are 0.00000000 for the audited truck ("Truck 12T ADR", plate
  NL-TF-02) while `vehiclelength`/`combinationlength` carry the real 10.0 m;
  (b) the "loading complete" concept exists twice — `tcstransportmodule$resourceinstance.completedloading`
  and `tcsloadingmeter$truckselection.completeloading` — and only the TruckSelection
  one is written by this widget (BR-47); (c) persisted PackingPlanItem positions are
  ABSOLUTE canvas metres (`px / scale`, no origin subtraction), so a DB audit that
  reads PositionX directly sees 2.69090909 for a load that is flush at the cabin —
  the truck frame starts at x = 333 px, i.e. 333 / scale metres.
- Root cause: (a) app-side data incompleteness, not a widget defect — the mapper
  reads combinationLength/combinationWidth and falls back to defaults, so the widget
  behaves correctly; (b)/(c) are domain/documentation facts worth recording so future
  DB audits and integration work are not misled.
- Fix (widget side): none required. (a) is app data entry; (b) documented in
  docs/MENDIX_ENTITY.md; (c) documented here and used to interpret the NL-TF-02 plan.
- Regression spec: none (data/ops finding — no widget code path to test).
- Lesson: when auditing persisted geometry from the DB, always offset PositionX by
  `TRUCK_CANVAS_LEFT / widthScale` before judging "near the cabin"; and when a second
  "complete loading" flag is introduced in the app model, decide explicitly which one
  is authoritative (this widget writes the TruckSelection one only).

  standing D-3 mock-sync debt.