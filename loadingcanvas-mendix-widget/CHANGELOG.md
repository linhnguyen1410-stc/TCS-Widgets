# Change Register — LoadingCanvas Widget

> **Single-source-of-truth for every behavioural change.**  
> This file is the *join table* across BUGLOG.md, DEBT.md, ADRs, and BUSINESS_RULES.md.  
> **Immutability rule:** once an entry is written, it is never edited — only new entries are appended.

---

## How to read this file (humans and AI agents)

| Field | Required | Purpose |
|-------|----------|---------|
| `id` | ✅ | `CH-####` — unique, never reused; join key for scripts |
| `date` | ✅ | ISO date — timeline ordering |
| `type` | ✅ | `feat\|fix\|refactor\|remove\|docs\|build` — filter by class |
| `layer` | ✅ | `core\|domain\|state\|infrastructure\|presentation\|build\|docs` — matches ARCHITECTURE.md layers |
| `title` | ✅ | Imperative *what* |
| `why` | ✅ | **The reason** — never "N/A"; use `housekeeping` honestly |
| `files` | ✅ | Change Impact scope; repo-root-relative paths |
| `commits` | ✅ | Short SHAs → `git show` for the diff |
| `rules` | ✅ | `BR-##` affected (`none`) |
| `fixes` | ✅ | `B-####` closed (`none`) |
| `debt` | ✅ | `none \| created D-# \| resolved D-# \| open D-#` |
| `verify` | ✅ | Spec path or command that proves it |
| `upgrade` | ⬜ | `none` or migration pointer |
| `breaking` | ✅ | `yes\|no` |
| `supersedes` | ⬜ | `CH-####` — design replaced, not lost |
| `note` | ⬜ | Trap/lesson (mirrors BUGLOG `Lesson`) |

### Quick-query greps (agent-friendly)
```bash
# All entries
grep '^#### CH-' CHANGELOG.md

# Where technical debt originated
grep -A13 'debt: created' CHANGELOG.md

# Everything that touched a business rule
grep -A13 'rules: .*BR-32' CHANGELOG.md

# Why a file looks the way it does
grep -A13 'files:.*planRepository' CHANGELOG.md

# All breaking changes
grep -A13 'breaking: yes' CHANGELOG.md
```

---

## Index

| ID | Date | Type | Layer | Summary | Rules | Fixes | Debt | Brk |
|----|------|------|-------|---------|-------|-------|------|-----|
| CH-0001 | 2026-09-14 | feat | infrastructure | Add import-ban guard script | — | — | none | no |
| CH-0002 | 2026-09-14 | fix | infrastructure | Declare widget online-only (offlineCapable=false) | BR-37, BR-38 | B-0001 | none | no |
| CH-0003 | 2026-09-14 | fix | infrastructure | Fix planRepository save (MxObject `this` context) | BR-32, BR-33 | B-0002 | none | no |
| CH-0004 | 2026-09-14 | fix | infrastructure | Fix container save (detached method) | BR-32, BR-33 | B-0003 | none | no |
| CH-0005 | 2026-09-14 | fix | domain | Fix SnapEngine priority order | BR-22, BR-23 | B-0004 | none | no |
| CH-0006 | 2026-09-14 | fix | infrastructure | Fix plan load identity (cargo-id vs plan-item-id) | BR-11, BR-12 | B-0005 | none | no |
| CH-0007 | 2026-09-14 | refactor | presentation | Extract CanvasToolbar from LoadingCanvasView | — | — | resolved D-1 | no |
| CH-0008 | 2026-09-14 | fix | domain | Rename axis semantics (width/height → length/width) | BR-20, BR-21 | — | none | yes |
| CH-0009 | 2026-09-14 | remove | domain | Remove ValidationEngine; validate from dispatcher | BR-40, BR-41 | — | none | no |
| CH-0010 | 2026-09-14 | refactor | state | Add CanvasController (manager + dispatcher + engines) | — | — | none | no |
| CH-0011 | 2026-09-14 | feat | domain | Implement auto-load packing optimizer | BR-26, BR-27 | — | none | no |
| CH-0012 | 2026-09-14 | refactor | infrastructure | Split planRepository into planLoader/planSaver | — | — | resolved D-2 | no |
| CH-0013 | 2026-09-15 | fix | docs | Fix all broken doc→path references (22 occurrences) | — | — | none | no |
| CH-0014 | 2026-09-15 | fix | docs | Delete all `template/…` anchors (15 sites) | — | — | none | no |
| CH-0015 | 2026-09-15 | build | build | Add doc-link guard + doc-fact guard + changelog guard | — | — | none | no |
| CH-0016 | 2026-09-15 | docs | docs | Add TEST_COVERAGE.md (generated) + DOC_MAP.md | — | — | none | no |
| CH-0017 | 2026-09-15 | docs | docs | Add design-mockups/README.md (adoption status) | — | — | none | no |
| CH-0018 | 2026-09-16 | build | build | Test the doc-toolchain scripts and enforce coverage thresholds | — | — | none | no |
| CH-0019 | 2026-09-17 | feat | presentation | Verify button also validates cargo placement in the truck | BR-40, BR-41, BR-45 | — | none | no |
| CH-0020 | 2026-09-17 | fix | presentation | Dedupe repeated placement errors in Verify message | BR-45 | — | none | no |
| CH-0021 | 2026-09-17 | fix | domain | Compute load meters from occupied X-span, not summed extents | BR-17, BR-45 | — | none | no |
| CH-0022 | 2026-09-18 | fix | infrastructure | Filter restored plan items to orders still in the TruckSelection | BR-37 | B-0007 | none | no |
| CH-0023 | 2026-09-18 | fix | presentation | Keep cargo-list empty state an active drop zone (post Auto Load) | — | B-0008 | none | no |
| CH-0024 | 2026-09-22 | fix | presentation | Land canvas drag/drop under the mouse cursor | BR-21, BR-22, BR-30 | B-0009 | none | no |
| CH-0025 | 2026-09-23 | fix | presentation | Wire list↔canvas unified pointer drag | BR-30 | B-0010 | none | no |
| CH-0026 | 2026-09-23 | fix | presentation | Make pointer gesture unstickable (finally cleanup, pointercancel, empty-state panel ref) | BR-30 | B-0011 | none | no |
| CH-0027 | 2026-09-23 | fix | presentation | Make canvas DESELECT background-only (fix truck→list return) | BR-30 | B-0012 | none | no |
| CH-0028 | 2026-09-24 | feat | domain | Allow free placement (overlap + parking outside the truck); Verify stays strict | BR-21, BR-22, BR-46 | — | none | no |
| CH-0029 | 2026-09-24 | fix | presentation | Hoist cargo-list chip tooltip out of the scroll container | — | B-0013 | none | no |
| CH-0030 | 2026-09-24 | fix | presentation | Lift the dragged card above settled cargo (z-index) | — | B-0014 | none | no |
| CH-0031 | 2026-09-30 | fix | presentation | Fix truck frame sizing rule + top-pinned identical backdrop for all trucks | BR-17 | — | none | no |
| CH-0032 | 2026-09-30 | remove | infrastructure | Remove [DEBUG] diagnostics after live verification | — | — | none | no |
| CH-0033 | 2026-09-30 | build | build | Fix docs-check gate stdout capture and wire it into prebuild | BR-17 | — | none | no |
| CH-0034 | 2026-10-05 | fix | state | Restore the ROTATE contract (locked guard + center-preserving clamp) | BR-46 | B-0015 | none | no |
| CH-0035 | 2026-10-05 | fix | domain | Realign domain fixture specs with implemented LM/bounds semantics | BR-17, BR-26, BR-45 | B-0016 | none | no |
| CH-0036 | 2026-10-05 | fix | infrastructure | Rewire Mendix data-loading test mocks to the current contract | — | B-0016 | none | no |
| CH-0037 | 2026-10-05 | build | build | Run CI on master, pin pretty-format for jest diffs, format the codebase | — | B-0016 | none | no |
| CH-0038 | 2026-10-05 | docs | docs | Register hygiene: backfill Index rows, correct coverage claims, drop artifacts | — | — | created D-4 | no |
| CH-0040 | 2026-10-05 | feat | domain | Pin tautliner capacity: 33 EUR pallets per 13.6 LM truck | BR-23, BR-26 | — | none | no |
| CH-0041 | 2026-10-05 | feat | domain | Prefer front-loaded big cargo in Auto Load packing (exact + skyline) | BR-24, BR-25 | — | none | no |
| CH-0042 | 2026-10-05 | feat | domain | Load the geometric maximum of 34 EUR pallets per 13.6 LM tautliner | BR-23, BR-24, BR-26 | — | none | no |
| CH-0043 | 2026-10-05 | feat | domain | Even wall loading: partial stacks hug both trailer walls + strict big-front pin | BR-24, BR-25 | — | none | no |
| CH-0044 | 2026-10-06 | feat | presentation | Verify-finalize chain: passing Verify saves the plan and sets TruckSelection CompleteLoading | BR-47 | — | none | no |
| CH-0048 | 2026-10-07 | fix | build | Harden documentation diff detection for first pushes | — | — | none | no |
| CH-0039 | 2026-10-05 | build | build | Gate the CI artifact upload on build success, add a job timeout, cover release-branch PRs | — | — | none | no |
| CH-0045 | 2026-10-07 | feat | presentation | Enclose each transport order's units in a dashed group in the cargo list | — | — | none | no |
| CH-0046 | 2026-10-07 | docs | build | Enforce script changes in the documentation gate | — | — | none | no |
| CH-0049 | 2026-10-07 | feat | domain | Planned loading order: Auto Load puts TransportOrderSequence order 1 at the cabin | BR-24 | — | none | no |
| CH-0050 | 2026-10-07 | feat | presentation | Paint the truck loading canvas white via CANVAS_BACKGROUND_COLOR | — | — | none | no |

---

<!-- DOCS_SYNC:recent-changes:START -->
| Date | ID | Type | Layer | Title |
|------|-----|------|-------|-------|
| 2026-10-07 | CH-0048 | fix | build | Harden documentation diff detection for first pushes |
| 2026-10-05 | CH-0039 | build | build | Gate the CI artifact upload on build success, add a job timeout, cover release-branch PRs |
| 2026-10-06 | CH-0044 | feat | presentation | Verify-finalize chain: passing Verify saves the plan and sets TruckSelection CompleteLoading |
| 2026-10-05 | CH-0043 | feat | domain | Even wall loading: partial stacks hug both trailer walls + strict big-front pin |
| 2026-10-05 | CH-0042 | feat | domain | Load the geometric maximum of 34 EUR pallets per 13.6 LM tautliner |
| 2026-10-05 | CH-0041 | feat | domain | Prefer front-loaded big cargo in Auto Load packing |
| 2026-10-05 | CH-0040 | feat | domain | Pin tautliner capacity: 33 EUR pallets per 13.6 LM truck |
| 2026-10-05 | CH-0038 | docs | docs | Register hygiene: backfill Index rows, correct coverage claims, drop artifacts |
| 2026-10-05 | CH-0037 | build | build | Run CI on master, pin pretty-format for jest diffs, format the codebase |
| 2026-10-05 | CH-0036 | fix | infrastructure | Rewire Mendix data-loading test mocks to the current contract |
<!-- DOCS_SYNC:recent-changes:END -->

## [Unreleased]

### Documentation
#### CH-0047 · docs · governance · Remove stale documentation workflow commands
- date: 2026-10-07
- why: .clinerules referenced docs:impact and docs:new commands that do not exist in the repository
- files: .clinerules
- commits: 940345e, (this change)
- rules: none
- fixes: none
- debt: none
- verify: docs-rules.mjs and package.json inspected; commands removed from workflow
- upgrade: none
- breaking: no


### Documentation
#### CH-0046 · docs · build · Enforce script changes in the documentation gate
- date: 2026-10-07
- why: the project rules require every scripts/** change to have a CHANGELOG entry, but the executable trigger matrix did not enforce that policy
- files: .github/workflows/ci.yml, scripts/docs-check.mjs, scripts/__tests__/docs-check.test.mjs, scripts/docs-rules.mjs, docs/DOC_MAP.md, CHANGELOG.md
- commits: b01eed7, (this change)
- rules: none
- fixes: none
- debt: none
- verify: npm run test:scripts && npm run docs:check && npm run check:changelog
- upgrade: none
- breaking: no
- note: scripts/**/*.mjs is now part of the executable documentation trigger matrix


### Fixed
- —
#### CH-0022 · fix · infrastructure · Filter restored plan items to orders still in the TruckSelection
- date: 2026-09-18
- why: a saved plan keeps PackingPlanItem rows for orders later removed from the
  TruckSelection; loadPackingPlan restored every row on reopen, so a removed order's
  cargos reappeared on the canvas even though they dropped off the cargo list (the
  persisted plan still referenced the removed order)
- files: src/infrastructure/adapters/planLoader.ts, src/presentation/widget/LoadingCanvas.container.tsx, src/infrastructure/mendix/__tests__/mendixDataAdapter.spec.ts, BUGLOG.md, CHANGELOG.md, docs/MENDIX_ENTITY.md
- commits: 0dba3e7
- rules: BR-37
- fixes: B-0007
- debt: none
- verify: src/infrastructure/mendix/__tests__/mendixDataAdapter.spec.ts
- upgrade: none
- breaking: no
- supersedes: —
- note: filter compares the pre-prefix order GUID via toCargoId; omitting the valid set preserves the old no-filter behavior (backwards compatible); stale rows are purged naturally on the next Save (BR-33 delete + recreate)

#### CH-0023 · fix · presentation · Keep cargo-list empty state an active drop zone (post Auto Load)
- why: after Auto Load every cargo is placed, so CargoList renders its empty state, which
  had no drop handlers; dragging a placed pallet back onto the list bubbled to the canvas
  and was treated as an in-truck re-position, so the card could never be returned to the list
- files: src/core/constants/cargoList.ts, src/presentation/components/CargoList.tsx, src/presentation/components/__tests__/CargoList.spec.tsx, BUGLOG.md, CHANGELOG.md
- commits: wip
- rules: none
- fixes: B-0008
- debt: none
- verify: src/presentation/components/__tests__/CargoList.spec.tsx ("empty state is still a drop zone")
- upgrade: none
- breaking: no
- supersedes: —
- note: the empty-state div now binds onDragOver/onDrop (calling onRemoveCargo) and keeps a stable one-row footprint (min-width plus one populated row height, 48px) so a drop is captured by the list rather than leaking to the enclosing canvas zone.

#### CH-0024 · fix · presentation · Land canvas drag/drop under the mouse cursor
- date: 2026-09-22
- why: mid-card grabs dropped with card top-left at the cursor and preview vs drop
  disagreed, because native HTML5 drop ignored the grab point and settled without
  collision while the custom drag fed rendered coords into data-space math
- files: src/presentation/hooks/coordinateRule.ts, src/presentation/hooks/useTruckCanvas.ts, src/presentation/components/CargoCard.tsx, src/presentation/widget/LoadingCanvasView.tsx, src/state/CanvasActionDispatcher.ts, src/state/CanvasController.ts, src/presentation/hooks/__tests__/coordinateRule.spec.ts, src/state/__tests__/CanvasActionDispatcher.spec.ts, src/presentation/components/__tests__/CargoCard.spec.tsx, ARCHITECTURE.md, BUGLOG.md, CHANGELOG.md
- commits: wip
- rules: BR-21, BR-22, BR-30
- fixes: B-0009
- debt: none
- verify: npm run test:unit (26 suites, 367 tests), npx tsc --noEmit, npm run lint, npm run build
- upgrade: none
- breaking: no
- note: payload `single:<id>:<grabX>:<grabY>` stays back-compatible with bare `single:<id>`; existing-card drops settle via collision-aware MOVE_ITEM; card gestures convert R - S once at the hook boundary

#### CH-0025 · fix · presentation · Wire list↔canvas unified pointer drag
- date: 2026-09-23
- why: the unified pointer gesture from CH-0024 was never connected in the composition
  root — CargoList never received onPointerDragStart or panelRef, so list→canvas drags
  never started and canvas→list drops never hit-tested the list; wiring also exposed a
  duplicate mouse+pointer drag start, a base-id collision on drag-add, and a
  pointer-capture retargeted trailing click that would double-add
- files: src/presentation/hooks/useTruckCanvas.ts, src/presentation/components/CargoList.tsx, src/presentation/components/CargoCard.tsx, src/presentation/widget/LoadingCanvasView.tsx, src/presentation/components/__tests__/CargoList.spec.tsx, src/presentation/components/__tests__/CargoCard.spec.tsx, BUGLOG.md, CHANGELOG.md
- commits: wip
- rules: BR-30
- fixes: B-0010
- debt: none
- verify: npm run test:unit (26 suites, 364 tests), npx tsc --noEmit, npm run lint, npm run build
- upgrade: none
- breaking: no
- supersedes: —
- note: CH-0024's native-DnD payload format is now obsolete — the gesture is pure pointer events with a 4px click/drag threshold and makeInstanceId instance ids on drag-add

#### CH-0026 · fix · presentation · Make pointer gesture unstickable (finally cleanup, pointercancel, empty-state panel ref)
- date: 2026-09-23
- why: after a list→truck drop, cleanup in handlePointerUp only ran on the happy path
  and no pointercancel handler existed, so one skipped/failed cleanup left pendingAddRef
  set forever and every later pointerdown early-returned (neither direction draggable);
  independently, the cargo-list empty-state render branch dropped the panel ref so the
  truck→list hit-test was always false (list was empty exactly when the last cargo was
  placed on the truck)
- files: src/presentation/hooks/useTruckCanvas.ts, src/presentation/components/CargoList.tsx, src/presentation/components/CargoCard.tsx, src/presentation/widget/LoadingCanvasView.tsx, src/presentation/hooks/__tests__/useTruckCanvas.spec.tsx, src/presentation/components/__tests__/CargoList.spec.tsx, src/presentation/components/__tests__/CargoCard.spec.tsx, BUGLOG.md, CHANGELOG.md
- commits: wip
- rules: BR-30
- fixes: B-0011
- debt: none
- verify: npm run test:unit (27 suites, 367 tests), npx tsc --noEmit, npm run lint, npm run build
- upgrade: none
- breaking: no
- note: gesture cleanup runs in finally with a pointercancel handler; guards read draggingRef (refs, not render state, survive memoized child closures); a stale pending gesture is cancelled by the next pointerdown instead of refused; the panel ref is bound in every render branch (panel div + empty state); DEFAULT_SCALE/DEFAULT_SCENE_OFFSET are module-scope because a default-param object literal re-keys the controller useMemo and loops (Maximum update depth exceeded)

#### CH-0027 · fix · presentation · Make canvas DESELECT background-only (truck→list return)
- date: 2026-09-23
- why: pointerdown.stopPropagation does not stop the follow-up native mousedown; the
  bubbled mousedown hit the canvas root handler and unconditionally DESELECTed right
  after START_DRAG, nulling activeItemId, so the pointerup removal branch skipped
  removeItem and dropping a card on the cargo list silently did nothing
- files: src/presentation/hooks/useTruckCanvas.ts, src/presentation/hooks/__tests__/useTruckCanvas.spec.tsx, BUGLOG.md, CHANGELOG.md
- commits: wip
- rules: BR-30
- fixes: B-0012
- debt: none
- verify: npm run test:unit (27 suites, 369 tests), npx tsc --noEmit, npm run lint, npm run build
- upgrade: none
- breaking: no
- note: DESELECT is background-only — a target inside [data-id] (card) or listPanelRef (chip) returns early; pointerdown and mousedown are independent event streams

#### CH-0029 · fix · presentation · Hoist cargo-list chip tooltip out of the scroll container
- date: 2026-09-24
- why: the chip tooltip rendered inside the cargo list's scroll container, whose
  overflow clipped it in both flip directions whenever the list was shorter than the
  tooltip (a one-row list showed no tips at all)
- files: src/presentation/components/CargoList.tsx, src/presentation/components/__tests__/CargoList.spec.tsx, BUGLOG.md, CHANGELOG.md
- commits: wip
- rules: none
- fixes: B-0013
- debt: none
- verify: npm run test:unit (27 suites, 376 tests), npx tsc --noEmit, npm run lint, npm run build
- upgrade: none
- breaking: no
- note: the tooltip is now a sibling of the panel anchored in canvas coordinates; placement flips against the canvas edges and CargoTooltip's CSS anchoring is unchanged

#### CH-0030 · fix · presentation · Lift the dragged card above settled cargo
- date: 2026-09-24
- why: cards are z-index auto (paint order = DOM order), so a card being dragged
  could render beneath other cards it was dragged over depending on its index in
  the items array
- files: src/core/constants/card.ts, src/presentation/components/CargoCard.tsx, src/presentation/components/__tests__/CargoCard.spec.tsx, BUGLOG.md, CHANGELOG.md
- commits: wip
- rules: none
- fixes: B-0014
- debt: none
- verify: npm run test:unit (27 suites, 378 tests), npx tsc --noEmit, npm run lint, npm run build
- upgrade: none
- breaking: no
- note: CARD_ACTIVE_Z_INDEX (20) applies only while a card is active; idle cards stay auto so tooltip/handle layering is untouched

### Added
#### CH-0018 · build · build · Test the doc-toolchain scripts and enforce coverage thresholds
- why: the doc-toolchain scripts (doc-links, changelog, sync) had zero tests and the real CHANGELOG parser never matched `#### CH-` entries (vacuous pass); also core/domain coverage thresholds from the optimization plan were missing
- files: scripts/__tests__/check-doc-links.test.mjs, scripts/__tests__/check-changelog.test.mjs, scripts/__tests__/docs-sync.test.mjs, scripts/check-changelog.mjs, scripts/check-doc-links.mjs, scripts/docs-sync.mjs, package.json, .github/workflows/ci.yml, docs/DOC_MAP.md
- commits: wip
- rules: none
- fixes: none
- debt: none
- verify: npm run test:scripts && npm run check:changelog && npm run check:docs
- upgrade: none
- breaking: no
- note: vitest was present transitively; now declared in devDependencies; validate() errors on unknown register IDs in content mode, warns in disk mode (historical paths may be renamed)

#### CH-0019 · feat · presentation · Verify button also validates cargo placement in the truck
- why: BR-40 verification compared only counts (placed vs expected), so a fully-placed but overlapping/out-of-bounds layout was still reported complete; the verify action must reflect real placement validity (overlap / bounds / load meters)
- files: src/presentation/components/CanvasToolbar.tsx, src/presentation/components/__tests__/CanvasToolbar.spec.tsx, BUSINESS_RULES.md, CHANGELOG.md
- commits: wip
- rules: BR-40, BR-41, BR-45
- fixes: none
- debt: none
- verify: npm test -- CanvasToolbar
- upgrade: none
- breaking: no

#### CH-0020 · fix · presentation · Dedupe repeated placement errors in Verify message
- why: the Verify "Placement invalid" message repeated the same error kind once per affected cargo (e.g. `OVERLAP, OVERLAP, …`) because `validateAll` aggregates one entry per item; the human-readable message should list each error kind once
- files: src/presentation/components/CanvasToolbar.tsx, src/presentation/components/__tests__/CanvasToolbar.spec.tsx, CHANGELOG.md
- commits: wip
- rules: BR-45
- fixes: none
- debt: none
- verify: src/presentation/components/__tests__/CanvasToolbar.spec.tsx
- upgrade: none
- breaking: no
- note: validateAll reports one error per affected item by design (locked by validationRules.spec); dedupe belongs at the message-composition layer via new Set().

#### CH-0021 · fix · domain · Compute load meters from occupied X-span instead of summed extents
- why: the load-meter check summed every cargo's X extent, so a normal multi-lane load (cargos stacked across the deck width sharing the same X span) was double-counted and always reported `LM_EXCEEDED`; per BR-17 load meters are the contiguous deck length the cargo occupies, so the X-projections must be merged into continuous intervals
- files: src/domain/rules/validationRules.ts, src/domain/rules/__tests__/validationRules.spec.ts, CHANGELOG.md
- commits: wip
- rules: BR-17, BR-45
- fixes: none
- debt: none
- verify: src/domain/rules/__tests__/validationRules.spec.ts (validateLoadMeters multi-lane cases)
- upgrade: none
- breaking: no
- note: merging contiguous X-intervals (union of projections) is the BR-17 model; brute-summing per item over-counts side-by-side cargo that share a deck length.

#### CH-0028 · feat · domain · Allow free placement (overlap + parking outside the truck) while Verify stays strict
- date: 2026-09-24
- why: manual placement force-resolved dropped/moved cargo onto non-overlapping spots inside the
  truck band, so the planner could neither stack cargo nor park it on the widget canvas outside
  the truck; free placement is required while the strict overlap check must stay available on
  demand through the Verify action
- files: src/domain/rules/validationRules.ts, src/domain/engines/DragEngine.ts, src/state/CanvasController.ts, src/state/CanvasActionDispatcher.ts, src/domain/rules/__tests__/validationRules.spec.ts, src/domain/engines/__tests__/DragEngine.spec.ts, src/state/__tests__/CanvasActionDispatcher.spec.ts, src/state/__tests__/CanvasController.spec.ts, BUSINESS_RULES.md, ARCHITECTURE.md, README.md, docs/UPGRADE_GUIDE.md, CHANGELOG.md
- commits: wip
- rules: BR-21, BR-22, BR-46
- fixes: none
- debt: none
- verify: npm run test:unit (27 suites, 375 tests), npx tsc --noEmit, npm run lint, npm run build
- upgrade: none
- breaking: no
- note: allowOverlap defaults to false so guarded resolution (BR-21/BR-22) stays available and tested; interaction validates against the widget canvas with overlaps allowed (load meters and canvas escapes still reported), while the Verify button keeps its own strict validateAll against the truck band (BR-45) and needed no wiring change

#### CH-0031 · fix · presentation · Fix truck frame sizing rule + top-pinned identical backdrop for all trucks
- date: 2026-09-30
- why: after the association fix the backdrop drawing scaled per truck; user spec: identical drawing for every truck pinned to the canvas top (center top), frames that fit render at the full band height (297px) with true-aspect length, longer trucks cap at 1453px and shrink height, and every frame centers on the drawing midline (TRUCK_DRAWING_MIDLINE_Y ≈ 191.29)
- files: src/core/constants/canvas.ts, src/infrastructure/adapters/truckAdapter.ts, src/presentation/widget/LoadingCanvasView.tsx, src/domain/rules/boundaryRules.ts, src/infrastructure/adapters/__tests__/truckAdapter.spec.ts, src/domain/rules/__tests__/validationRules.spec.ts, README.md, ARCHITECTURE.md, docs/MENDIX_ENTITY.md, MCP_TESTING_GUIDE.md
- commits: (this change)
- rules: BR-17
- fixes: none
- debt: none
- verify: npm test -- --testPathPattern=truckAdapter (21/21 pass — DB-verified fleet measurements)
- upgrade: none
- breaking: no
- note: with the fixed backdrop the truck front in data coords is the frame's left edge, so getTruckFrontDataX now returns truck.x — load meters no longer carry phantom offsets for non-default trucks (12T: 0.42m, 20FT: 1.3m); temporary diagnostic check_scales.js removed

#### CH-0032 · remove · infrastructure · Remove [DEBUG] diagnostics after live verification
- date: 2026-09-30
- why: the Step 1-8 association-chain logs and the Auto Load bounds logs were temporary diagnostics from the bug investigation; the fix is verified live and locked by the fleet measurement tests, so the logs are dead code
- files: src/infrastructure/adapters/truckLoader.ts, src/presentation/components/CanvasToolbar.tsx
- commits: (this change)
- rules: none
- fixes: none
- debt: none
- verify: npx tsc --noEmit && npm test -- --testPathPattern=truckAdapter|CanvasToolbar (21/21 + 4/4)
- upgrade: none
- breaking: no
- note: contextual console.warn association fallbacks and the catch-path console.error remain by design (bounded fallbacks must log contextually)

#### CH-0033 · build · build · Fix docs-check gate stdout capture and wire it into prebuild
- date: 2026-09-30
- why: run() discarded execSync's captured stdout, so getChangedFiles() was always empty and the gate reported "Changed files: 0", vacuously skipping the doc-rules and CHANGELOG checks; docs:check also invoked only the link guard, so the full gate never ran anywhere
- files: scripts/docs-check.mjs, scripts/__tests__/docs-check.test.mjs, package.json, BUSINESS_RULES.md, docs/UPGRADE_GUIDE.md, README.md, ARCHITECTURE.md, docs/DOC_MAP.md, docs/TEST_COVERAGE.md
- commits: (this change)
- rules: BR-17
- fixes: none
- debt: none
- verify: node scripts/docs-check.mjs (live gate detects the working-tree diff and all checks pass)
- upgrade: none
- breaking: no
- note: BR-17 now documents the LM measurement origin (truck frame left edge, truck.x); npm run test:scripts (vitest 1.6.1) fails on Node 24 for all script tests — pre-existing toolchain incompatibility, the docs-check.test.mjs regression suite will run once vitest is upgraded; latent gaps flagged — BUGLOG.md/DEBT.md are required docs for fix/debt-conditioned rules but do not exist, and docs-new.mjs referenced by docs-rules.mjs and .clinerules is missing

#### CH-0045 · feat · presentation · Enclose each transport order's units in a dashed group in the cargo list
- date: 2026-10-07
- why: the cargo list rendered every unit flat, so the chips of a multi-unit transport order were visually indistinguishable from other orders' chips; grouping an order's units under one dashed border makes each order's set readable at a glance
- files: src/core/constants/cargoList.ts, src/presentation/components/CargoList.tsx, src/presentation/components/__tests__/CargoList.spec.tsx, README.md, ARCHITECTURE.md, CHANGELOG.md, docs/DOC_MAP.md, docs/TEST_COVERAGE.md
- commits: (this change)
- rules: none
- fixes: none
- debt: none
- verify: src/presentation/components/__tests__/CargoList.spec.tsx ("CargoList transport-order grouping")
- upgrade: none
- breaking: no
- supersedes: —
- note: groups are keyed by the availableItems entry id (cargo.id), NOT fromCargoId — fromCargoId strips a trailing numeric suffix, so it collides for ids that differ only by that suffix (React duplicate-key warning); placed-instance tracking still uses fromCargoId


#### CH-0049 · feat · domain · Planned loading order: Auto Load puts TransportOrderSequence order 1 at the cabin
- date: 2026-10-07
- why: the truck's planned loading order lives in TransportOrderSequence.OrderSequence
  (verified in the DB: seq 1 = order 40813871633989908, seq 2 = ...850 for the NL-TF-02
  TruckSelection), but the widget never read it — Auto Load ordered cargo by footprint
  area only, so a multi-drop load did not put order 1 nearest the cabin
- files: src/infrastructure/adapters/sequenceLoader.ts, src/infrastructure/adapters/__tests__/sequenceLoader.spec.ts, src/infrastructure/mendix/mendixSchema.ts, src/infrastructure/mendix/mendixDataAdapter.ts, src/infrastructure/adapters/cargoLoader.ts, src/infrastructure/adapters/cargoAdapter.ts, src/infrastructure/adapters/__tests__/cargoAdapter.spec.ts, src/core/types/viewModels/CargoItem.ts, src/domain/packing/packingRules.ts, src/domain/packing/__tests__/packingRules.spec.ts, src/domain/packing/__tests__/auto-load.integration.spec.ts, src/presentation/widget/LoadingCanvas.container.tsx, BUSINESS_RULES.md, docs/MENDIX_ENTITY.md, ARCHITECTURE.md, README.md, CHANGELOG.md
- commits: (this change)
- rules: BR-24
- fixes: none
- debt: none
- verify: npm test -- --testPathPattern="(sequenceLoader|packingRules|auto-load)"
- upgrade: none
- breaking: no
- supersedes: —
- note: implemented as a SLOT ASSIGNMENT post-pass, not a rank term — the approved plan's
  aggregate sequenceBias rank was dropped mid-implementation after the diagnostic proved a
  scalar rank cannot express "order 1 owns the cabin-most span": with 3 lanes there are
  three dx = 0 front slots, so the aggregate metric preferred a layout that put order 2 at
  the frontier (measured rank 7425 vs 8167.5 for the block), and the equal-footprint
  symmetry rule consumes a group's units in input order so the search could not even reach
  the block; the post-pass leaves the solver's geometry untouched (placed count, span,
  overlaps, load meters unchanged — it only permutes identical-footprint units) and assigns
  the front-most slots (smallest X then Y) in OrderSequence order; no sequence data is a
  no-op, so every pre-existing packing pin still holds; the exact solver's equal-footprint
  symmetry rule also means <=16 identical units fill row-major (8+2+2 in the NL-TF-02 frame)
  rather than as a compact block — pre-existing behaviour, observed while pinning this rule


#### CH-0050 · feat · presentation · Paint the truck loading canvas white via CANVAS_BACKGROUND_COLOR
- date: 2026-10-07
- why: the canvas bed was off-white (#fafafa), which cast a grey tint over the drawn
  truck and muted the cargo colours; the loading canvas must read as a plain white bed
- files: src/core/constants/theme.ts, src/LoadingCanvas.editorPreview.tsx, design-mockups/README.md, CHANGELOG.md
- commits: (this change)
- rules: none
- fixes: none
- debt: none
- verify: npx tsc --noEmit && npm run build (the preview surface is bundled, not unit-tested)
- upgrade: none
- breaking: no
- supersedes: —
- note: CANVAS_BACKGROUND_COLOR already existed and was already wired to both canvas render
  branches in LoadingCanvasView; only its value changed to white, and the duplicate
  "#fafafa" literal in the Mendix Studio editor preview now reuses the constant (no
  hard-coded backgrounds left). No widget property or layout changed.


### Changed
- —

### Removed
- —

### Refactored
- —

---

## [1.0.0] — 2026-09-14

### Added
#### CH-0001 · feat · infrastructure · Add import-ban guard script
- why: enforce layer boundaries (domain no Mendix/React, core zero deps, etc.) at lint time
- files: scripts/check-imports.mjs, package.json
- commits: d86a5cd
- rules: none
- fixes: none
- debt: none
- verify: npm run check:imports
- upgrade: none
- breaking: no
- note: mirrors ARCHITECTURE.md dependency rules

#### CH-0011 · feat · domain · Implement auto-load packing optimizer
- why: BR-26/BR-27 require automatic packing; first-fit decreasing by load-meter
- files: src/domain/packing/packingOptimizer.ts, src/domain/packing/packingRules.ts, src/state/CanvasController.ts
- commits: 34bea57, 0a413d4
- rules: BR-26, BR-27
- fixes: none
- debt: none
- verify: src/domain/packing/__tests__/packingOptimizer.spec.ts
- upgrade: none
- breaking: no

### Fixed
#### CH-0002 · fix · infrastructure · Declare widget online-only (offlineCapable="false")
- why: plan/cargo loads use `mx.data.get({ xpath })`, which Mendix 10 does not support offline; "true" was a copy-paste default
- files: src/LoadingCanvas.xml
- commits: d86a5cd
- rules: BR-37, BR-38
- fixes: B-0001
- debt: none
- verify: XML manifest review gate; docs/adr/0001-offline-capable.md
- upgrade: none
- breaking: no
- note: flipping back to "true" requires guid/guids fetch paths first

#### CH-0003 · fix · infrastructure · Fix planRepository save (MxObject `this` context)
- why: calling `obj.set`/`obj.get` via detached variable loses `this`; must call directly on the object
- files: src/infrastructure/adapters/planRepository.ts (now planSaver.ts)
- commits: d86a5cd
- rules: BR-32, BR-33
- fixes: B-0002
- debt: none
- verify: src/infrastructure/adapters/__tests__/planSaver.spec.ts (if exists) or manual
- upgrade: none
- breaking: no
- note: .clinerules §1 now codifies this

#### CH-0004 · fix · infrastructure · Fix container save (detached method)
- why: `const setSafe = obj.set` then `setSafe(...)` loses `this`; call `obj.set(...)` directly
- files: src/presentation/widget/LoadingCanvas.container.tsx
- commits: d86a5cd
- rules: BR-32, BR-33
- fixes: B-0003
- debt: none
- verify: manual (container not unit-tested)
- upgrade: none
- breaking: no

#### CH-0005 · fix · domain · Fix SnapEngine priority order
- why: snap-to-grid ran before snap-to-boundary, allowing items outside truck; order reversed
- files: src/domain/engines/SnapEngine.ts
- commits: d86a5cd
- rules: BR-22, BR-23
- fixes: B-0004
- debt: none
- verify: src/domain/engines/__tests__/SnapEngine.spec.ts
- upgrade: none
- breaking: no

#### CH-0006 · fix · infrastructure · Fix plan load identity (cargo-id vs plan-item-id)
- why: load fallback used PackingPlanItem GUID instead of TransportOrder association; caused filter mismatch
- files: src/infrastructure/adapters/planLoader.ts, src/core/utils/cargoId.ts
- commits: d86a5cd
- rules: BR-11, BR-12
- fixes: B-0005
- debt: none
- verify: src/core/utils/__tests__/cargoId.spec.ts, src/core/utils/__tests__/cargoId.invariant.spec.ts
- upgrade: none
- breaking: no
- note: association must be read via `mxObject.get("TCSLoadingMeter.PackingPlanItem_TransportOrder")`

#### CH-0007 · refactor · presentation · Extract CanvasToolbar from LoadingCanvasView
- why: LoadingCanvasView exceeded 350-line budget (D-1); toolbar is independently testable
- files: src/presentation/components/CanvasToolbar.tsx (new), src/presentation/widget/LoadingCanvasView.tsx
- commits: 08ab085
- rules: none
- fixes: none
- debt: resolved D-1
- verify: src/presentation/components/__tests__/CanvasToolbar.spec.tsx (if added)
- upgrade: none
- breaking: no

#### CH-0008 · fix · domain · Rename axis semantics (width/height → length/width)
- why: "width" was ambiguous between X and Y extent; `length` = X (trailer length), `width` = Y (footprint)
- files: src/core/types/geometry.ts, src/domain/rules/geometryRules.ts, src/state/CanvasActionDispatcher.ts, src/presentation/components/*.tsx, src/presentation/hooks/*.ts
- commits: 8011e0d, 0260968
- rules: BR-20, BR-21
- fixes: none
- debt: none
- verify: src/domain/rules/__tests__/rotationRules.spec.ts, src/domain/rules/__tests__/geometryRules.spec.ts
- upgrade: none
- breaking: yes (internal rename across all layers)
- note: do NOT reintroduce `height` for the Y footprint

#### CH-0009 · remove · domain · Remove ValidationEngine; validate from dispatcher
- why: engine only delegated to `validationRules`; extra hop added indirection with no behaviour
- files: src/domain/rules/validationRules.ts, src/state/CanvasActionDispatcher.ts (deleted ValidationEngine)
- commits: b24ca4c
- rules: BR-40, BR-41
- fixes: none
- debt: none
- verify: src/domain/rules/__tests__/validationRules.spec.ts
- upgrade: none
- breaking: no
- note: there is intentionally NO ValidationEngine (see docs/UPGRADE_GUIDE.md)

#### CH-0010 · refactor · state · Add CanvasController (manager + dispatcher + engines)
- why: interaction machine — hooks are thin React adapters over it (ARCHITECTURE.md)
- files: src/state/CanvasController.ts (new), src/state/CanvasStateManager.ts, src/state/CanvasActionDispatcher.ts, src/presentation/hooks/useCanvasState.ts, src/presentation/hooks/useCanvasActions.ts
- commits: dd0add2
- rules: none
- fixes: none
- debt: none
- verify: src/state/__tests__/CanvasController.spec.ts
- upgrade: none
- breaking: no

### Refactored
#### CH-0012 · refactor · infrastructure · Split planRepository into planLoader/planSaver
- why: single file mixed read and write; separation enables independent testing and mocking
- files: src/infrastructure/adapters/planLoader.ts (new), src/infrastructure/adapters/planSaver.ts (new), deleted planRepository.ts
- commits: a11f809, 252191f
- rules: BR-32 through BR-39
- fixes: none
- debt: resolved D-2
- verify: src/infrastructure/adapters/__tests__/planLoader.spec.ts, planSaver.spec.ts
- upgrade: none
- breaking: no

### Documentation
#### CH-0013 · fix · docs · Fix all broken doc→path references (22 occurrences)
- why: 15 distinct paths across ARCHITECTURE.md, BUSINESS_RULES.md, docs/UPGRADE_GUIDE.md were stale or wrong
- files: ARCHITECTURE.md, BUSINESS_RULES.md, docs/UPGRADE_GUIDE.md, docs/MENDIX_ENTITY.md, docs/adr/0001-offline-capable.md, docs/adr/README.md
- commits: (this change)
- rules: none
- fixes: none
- debt: none
- verify: npm run check:docs
- upgrade: none
- breaking: no

#### CH-0014 · fix · docs · Delete all `template/…` anchors (15 sites)
- why: dangling cross-references to non-existent external template; replaced with real in-repo IDs
- files: BUGLOG.md (6), DEBT.md (3), docs/adr/README.md, docs/adr/0001-offline-capable.md, scripts/check-imports.mjs, src/core/utils/cargoId.ts (2), src/core/utils/__tests__/cargoId.invariant.spec.ts, src/domain/engines/__tests__/SnapEngine.spec.ts, src/infrastructure/adapters/planRepository.ts, src/infrastructure/adapters/planSaver.ts, src/presentation/components/CanvasToolbar.tsx, src/presentation/widget/LoadingCanvas.container.tsx, src/presentation/widget/LoadingCanvasView.tsx
- commits: (this change)
- rules: none
- fixes: none
- debt: none
- verify: npm run check:docs (bans `template/…`)
- upgrade: none
- breaking: no

### Build
#### CH-0015 · build · build · Add doc-link guard + doc-fact guard + changelog guard
- why: prevent future drift; `prebuild` gate enforces all three
- files: scripts/check-doc-links.mjs, scripts/docs-check.mjs, scripts/check-changelog.mjs, package.json
- commits: (this change)
- rules: none
- fixes: none
- debt: none
- verify: npm run check:docs && npm run check:changelog
- upgrade: none
- breaking: no

#### CH-0016 · docs · docs · Add TEST_COVERAGE.md (generated) + DOC_MAP.md
- why: SSOT for coverage numbers; DOC_MAP is the SSOT-of-SSOT ownership table
- files: docs/TEST_COVERAGE.md, docs/DOC_MAP.md, scripts/docs-sync.mjs
- commits: (this change)
- rules: none
- fixes: none
- debt: none
- verify: npm run docs:sync && npm run docs:check
- upgrade: none
- breaking: no

#### CH-0017 · docs · docs · Add design-mockups/README.md (adoption status)
- why: mockups were unlinked; now documented as exploratory (none adopted)
- files: design-mockups/README.md, README.md
- commits: (this change)
- rules: none
- fixes: none
- debt: none
- verify: links resolve
- upgrade: none
- breaking: no

### Fixed
#### CH-0034 · fix · state · Restore the ROTATE contract (locked guard + center-preserving clamp)
- date: 2026-10-05
- why: the ROTATE rewrite (acfc948) dropped the `isLocked` guard and replaced the
  center-preserving, canvas-clamping `DragEngine.rotateItem` call with an inline
  rotation bump — locked items rotated, rotated items visibly teleported, and
  near-edge rotations escaped the widget canvas (BR-46 re-anchoring broken)
- files: src/state/CanvasActionDispatcher.ts, BUGLOG.md, CHANGELOG.md
- commits: (this change)
- rules: BR-46
- fixes: B-0015
- debt: none
- verify: npm test -- --testPathPattern="state/__tests__"
- upgrade: none
- breaking: no
- note: `DragEngine.rotateItem` had been dead code since the rewrite (only its own unit tests called it); the dispatcher is its production caller again, matching ARCHITECTURE.md

#### CH-0035 · fix · domain · Realign domain fixture specs with the implemented LM/bounds semantics
- date: 2026-10-05
- why: the validation refactor changed load-meter semantics (truckFrontDataX offset,
  positive-interval clamping) and the truck band position, but the sibling fixtures
  were not realigned — six validationRules and three verify-gate tests asserted
  outcomes their own data could not produce, and the auto-load spec pre-expanded
  quantities before `autoLoadCargoUnits`, nesting instance ids (cargo-A-0-1) and
  breaking the documented raw-entry contract
- files: src/domain/rules/__tests__/validationRules.spec.ts, src/domain/rules/__tests__/verify-gate.integration.spec.ts, src/domain/packing/__tests__/auto-load.integration.spec.ts, BUGLOG.md, CHANGELOG.md
- commits: (this change)
- rules: BR-17, BR-26, BR-45
- fixes: B-0016
- debt: none
- verify: npm test -- --testPathPattern="validationRules" (and "verify-gate", "auto-load")
- upgrade: none
- breaking: no
- note: fixtures now place cargo inside the truck band and make rotation genuinely flip the LM outcome; the validateItem test helper excludes the item itself, mirroring validateAll's excludeIndex contract

#### CH-0036 · fix · infrastructure · Rewire Mendix data-loading test mocks to the current contract
- date: 2026-10-05
- why: `loadCargoItems`/`loadTruckAndScale`/`loadPackingPlan` follow association
  chains and batch order (orders→units→types; TruckSelection→ResourceInstance→
  Resource→TechnicalDetails), but the enrichment mocks returned no orders, lacked
  `getGuid`/`set` (failing `isMxObject`), and the data-loading integration spec
  typed its mock as `jest.fn<() => void>` (TS2345 — the suite never compiled)
- files: src/infrastructure/mendix/__tests__/mendixDataAdapter.spec.ts, src/infrastructure/adapters/__tests__/data-loading.integration.spec.ts, BUGLOG.md, CHANGELOG.md
- commits: (this change)
- rules: none
- fixes: B-0016
- debt: none
- verify: npm test -- --testPathPattern="mendixDataAdapter" (and "data-loading")
- upgrade: none
- breaking: no
- note: cargo ids stay keyed by the TransportOrder GUID (cargoAdapter contract), so the integration spec now asserts `cargo-order-1` instead of the pre-refactor `cargo-pu-1`

### Build
#### CH-0037 · build · build · Run CI on master, pin pretty-format for jest diffs, format the codebase
- date: 2026-10-05
- why: the CI workflow triggered only on `main`/`release/*` while the repo lives on
  `master`, so the whole gate never ran and red tests plus lint failures shipped;
  jest 29 resolved a hoisted pretty-format v27 that masked every failure diff
  ("Unknown option maxWidth"); 23 files had drifted from Prettier style
- files: .github/workflows/ci.yml, package.json, package-lock.json, docs/UPGRADE_GUIDE.md, src/core/constants/canvas.ts, src/domain/rules/boundaryRules.ts, src/domain/rules/validationRules.ts, src/infrastructure/adapters/__tests__/planRepository.requiredDates.spec.ts, src/infrastructure/adapters/__tests__/truckAdapter.spec.ts, src/infrastructure/adapters/truckAdapter.ts, src/infrastructure/adapters/truckLoader.ts, src/infrastructure/mendix/mendixDataAdapter.ts, src/infrastructure/mendix/mendixMappers.ts, src/infrastructure/mendix/mendixRuntime.ts, src/infrastructure/mendix/mendixSchema.ts, src/presentation/components/CanvasToolbar.tsx, src/presentation/components/__tests__/CanvasToolbar.spec.tsx, src/presentation/hooks/__tests__/coordinates.integration.spec.ts, src/presentation/hooks/__tests__/drag-gesture.integration.spec.ts, src/presentation/widget/LoadingCanvas.container.tsx, src/presentation/widget/LoadingCanvasView.tsx, CHANGELOG.md
- commits: (this change)
- rules: none
- fixes: B-0016
- debt: none
- verify: npm run lint && npm test && npx tsc --noEmit
- upgrade: none
- breaking: no
- note: `pretty-format@29.7.0` is declared as a direct devDependency so the root hoist satisfies jest 29 (a temporary failing test verified real diffs print again); `@eslint/js` and `globals` are declared too (`.eslintrc.js` previously resolved them only via hoisting); a Node-20 note for `test:scripts` went into docs/UPGRADE_GUIDE.md; the formatting sweep touches no logic

### Docs
#### CH-0038 · docs · docs · Register hygiene: backfill Index rows, correct coverage claims, drop artifacts
- date: 2026-10-05
- why: CH-0018/0019/0020 existed as body entries but were missing from the Index
  table; `docs/TEST_COVERAGE.md` claimed coverage thresholds were "enforced" while
  the wrapper never enforced them (D-4); `untested.txt` and `lm_test_out.txt` debug
  artifacts were committed; and the docs-sync recent-changes parser matched neither
  entry format, rendering the region permanently empty
- files: scripts/docs-sync.mjs, scripts/__tests__/docs-sync.test.mjs, docs/TEST_COVERAGE.md, BUGLOG.md, DEBT.md, CHANGELOG.md
- commits: (this change)
- rules: none
- fixes: none
- debt: created D-4
- verify: node scripts/check-changelog.mjs && npm run docs:sync && npm run docs:check
- upgrade: none
- breaking: no
- note: deleted committed artifacts `untested.txt`/`lm_test_out.txt` (paths removed from the repo, hence not listable in files:); docs-sync ENTRY_HEADER now mirrors check-changelog's proven regex and its test asserts a real entry row instead of a pre-existing marker

#### CH-0040 · feat · domain · Pin tautliner capacity: 33 EUR pallets per 13.6 LM truck
- date: 2026-10-05
- why: the industry-standard capacity of a 13.6 LM tautliner (33 EUR pallets, 3 lanes
  × 11 columns) had no regression guard — a skyline, EPSILON or exact-limit change
  could silently reduce it without any test noticing
- files: src/domain/packing/__tests__/auto-load.integration.spec.ts, BUSINESS_RULES.md, ARCHITECTURE.md, CHANGELOG.md
- commits: (this change)
- rules: BR-23, BR-26
- fixes: none
- debt: none
- verify: npm test -- --testPathPattern="auto-load"
- upgrade: none
- breaking: no
- note: fixtures use the production capped geometry (scale = TRUCK_CANVAS_WIDTH/13.6, frame ≈ 1453 × 261.75 px), not the 297 px fitting-truck height; the 34-pallet offer is pinned at 33 placed — the skyline's upright-first ceiling, with the geometric 34-layout documented in the test comment

#### CH-0041 · feat · domain · Prefer front-loaded big cargo in Auto Load packing
- date: 2026-10-05
- why: Auto Load had no ordering preference between equally compact layouts, so big
  cargo could sit behind small cargo; big cargo must anchor at the truck front
  (loading side) so the load's center of mass stays predictable for the planned
  weight-distribution check
- files: src/domain/packing/packingOptimizer.ts, src/domain/packing/packingRules.ts, src/domain/packing/__tests__/packingOptimizer.spec.ts, src/domain/packing/__tests__/auto-load.integration.spec.ts, BUSINESS_RULES.md, ARCHITECTURE.md, README.md, CHANGELOG.md
- commits: (this change)
- rules: BR-24, BR-25, BR-26
- fixes: none
- debt: none
- verify: npm test -- --testPathPattern="packingOptimizer" (and "auto-load", "packingRules")
- upgrade: none
- breaking: no
- note: the new frontBias rank term (Σ area × distance behind the loading front) is monotone non-decreasing down a branch, so the branch-and-bound prunes keep working and the 400 ms anytime budget is unchanged; the skyline fallback now anchors leftmost-first ((x, y) ties) instead of lowest-first so big units (area-descending order) stack into front columns; placed-count still outranks the front preference, and the tautliner 33-pallet pins are unaffected (identical pallets produce the same grid under both anchor orders)

#### CH-0042 · feat · domain · Load the geometric maximum of 34 EUR pallets per 13.6 LM tautliner
- date: 2026-10-05
- why: the widget's geometric model has no loading gaps, so rotating every EUR pallet
  90° fits 2 lanes × 17 columns (17 × 0.8 m = exactly 13.6 LM) — one more than the
  upright 3-lane × 11-column layout — but the skyline's per-spot upright preference
  never explored the all-rotated global layout
- files: src/domain/packing/packingRules.ts, src/domain/rules/geometryRules.ts, src/domain/rules/validationRules.ts, src/domain/rules/__tests__/validationRules.spec.ts, src/domain/packing/__tests__/auto-load.integration.spec.ts, BUSINESS_RULES.md, CHANGELOG.md
- commits: (this change)
- rules: BR-23, BR-24, BR-26
- fixes: none
- debt: none
- verify: npm test -- --testPathPattern="auto-load" (and "packingRules", "validationRules")
- upgrade: none
- breaking: no
- supersedes: CH-0040
- note: three measured float knife-edges fixed with bounded tolerances — skyline bridging span 85.47058823529369 vs footprint 85.47058823529413 (4.4e-13 under, EPSILON 1e-4 in the bridging check), 17th column right edge 1786.0000000000002 (2.27e-13 over, BOUNDS_EPSILON 1e-4 in geometryRules.isInsideBounds), occupied span 13.600000000000001 LM (1.78e-15 over, LM_EPSILON 1e-9 m in validateLoadMeters); the rotated-first skyline pass is kept only when it places strictly more units, so the 33-pallet load and every count tie still prefer the upright layout (BR-26); industry practice loads 33 due to physical pallet tolerances — recorded in BR-23

#### CH-0043 · feat · domain · Even wall loading: partial stacks hug both trailer walls + strict big-front pin
- date: 2026-10-05
- why: nothing balanced the truck's width axis — the exact solver's tie-breaking and
  the skyline both filled lanes top-down, so partial columns hugged the canvas top
  and the bottom trailer wall stayed empty; the user also required ALL big cargo
  anchored at the loading front as a strict, pinned contract
- files: src/domain/packing/packingRules.ts, src/domain/packing/__tests__/packingRules.spec.ts, src/domain/packing/__tests__/auto-load.integration.spec.ts, BUSINESS_RULES.md, ARCHITECTURE.md, README.md, CHANGELOG.md
- commits: (this change)
- rules: BR-24, BR-25
- fixes: none
- debt: none
- verify: npm test -- --testPathPattern="packingRules" (and "auto-load")
- upgrade: none
- breaking: no
- note: implemented as a deterministic walls-inward post-pass on packCargoIntoBounds results (both solver paths) — the planned wallBias rank term was dropped mid-implementation because the exact solver's normal-form corner candidates include only top edges, making the term unreachable; the post-pass re-slots same-anchor stacks alternately (top stack grows down, bottom stack grows up), is overlap-free by construction inside a stack, is collision-checked against differently anchored neighbours with a keep-original fallback, and never touches X positions (front bias and load meters unchanged); the flush-stack pin in packingRules.spec was consciously revised — partial stacks now anchor the second shelf to the bottom wall (slack gap mid-column) per the new BR-25; the strict max(big.x) ≤ min(small.x) assertion pins big-front where lane sharing is impossible

#### CH-0044 · feat · presentation · Verify-finalize chain: passing Verify saves the plan and sets TruckSelection CompleteLoading
- date: 2026-10-06
- why: the user required Auto Load → Verify → Save PackingPlan → CompleteLoading = true as one
  flow, clarified so ONLY an explicit Verify click with a passing status (BR-45) triggers the
  save + flag write; previously Verify was a pure check and CompleteLoading was never written
- files: src/infrastructure/mendix/mendixSchema.ts, src/infrastructure/adapters/truckSelectionSaver.ts, src/infrastructure/mendix/mendixDataAdapter.ts, src/presentation/widget/LoadingCanvas.container.tsx, src/presentation/widget/LoadingCanvas.properties.ts, src/presentation/widget/LoadingCanvasView.tsx, src/presentation/components/CanvasToolbar.tsx, src/infrastructure/mendix/__tests__/mendixDataAdapter.spec.ts, src/presentation/components/__tests__/CanvasToolbar.spec.tsx, BUSINESS_RULES.md, docs/MENDIX_ENTITY.md, ARCHITECTURE.md, README.md, CHANGELOG.md
- commits: (this change)
- rules: BR-47
- fixes: none
- debt: none
- verify: npm test -- --testPathPattern="mendixDataAdapter" (and "CanvasToolbar")
- upgrade: none
- breaking: no
- note: the chain lives in the toolbar's handleVerify — strictly additive after the existing
  verification computation (the four pre-existing Verify tests pass unchanged); the container
  orchestrates savePackingPlan → markTruckSelectionCompleteLoading and returns a boolean so a
  failed save or flag write surfaces via the existing saveError block and never sets the flag;
  isFinalizing disables all four action buttons against double-click reentry; BR-41's item-count
  effect now also clears the completion message; no new widget XML properties, so no widget
  upgrade note

### Build
#### CH-0039 · build · build · Gate the CI artifact upload on build success, add a job timeout, cover release-branch PRs
- date: 2026-10-05
- why: `if: always()` on the artifact upload step made every red CI run upload an
  empty "widget-build" artifact (Build runs immediately before the upload, so when
  an earlier check failed, `dist/` never existed on the fresh checkout and
  upload-artifact v4 silently warned and created an empty artifact); PRs targeting
  `release/*` ran no CI at all even though pushes to those branches are triggered;
  and the job had no `timeout-minutes`, so a hung step burned the 360-minute default
- files: .github/workflows/ci.yml, CHANGELOG.md
- commits: (this change)
- rules: none
- fixes: none
- debt: none
- verify: node scripts/check-changelog.mjs && npm run docs:check (workflow runtime behavior is observable only on GitHub Actions)
- upgrade: none
- breaking: no
- note: upload-artifact v4 defaults `if-no-files-found` to `warn`, which is why the empty artifact never failed the job; the upload is now gated on `steps.build.outcome == 'success'` with `if-no-files-found: error`
### Build
#### CH-0048 · fix · build · Harden documentation diff detection for first pushes
- date: 2026-10-07
- why: a first push can expose GitHub's all-zero `github.event.before`; passing it directly to `git diff` makes the documentation gate fail with an invalid revision, while a stale script comment referenced a removed workflow helper
- files: .github/workflows/ci.yml, scripts/docs-check.mjs, scripts/__tests__/docs-check.test.mjs, scripts/docs-rules.mjs, CHANGELOG.md
- commits: c80f4cc, 41e7c79, 058d881, 5dc9a7f, (this change)
- rules: none
- fixes: none
- debt: none
- verify: npm run test:scripts && npm run docs:check
- upgrade: none
- breaking: no
- note: CI falls back to the repository default branch on a first push; docs-check rejects all-zero SHAs defensively instead of issuing an invalid git diff
