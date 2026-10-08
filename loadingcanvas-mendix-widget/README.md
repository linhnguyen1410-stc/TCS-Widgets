# LoadingCanvas Widget

## Overview

**LoadingCanvas** is a Mendix pluggable widget for interactive truck loading and packing planning. It provides an interactive canvas where users can drag, rotate, and validate cargo items (pallet/box) within a truck boundary. The widget supports grid snapping, real-time collision detection, and integration with Mendix Data API for saving/loading packing plans.

Built with **React** (pinned via package.json `overrides`/`resolutions`, automatic JSX runtime), **TypeScript**, and the **Mendix pluggable-widgets-tools** toolchain. See [ARCHITECTURE.md](ARCHITECTURE.md) for the detailed architecture documentation.

---

## Features

- **Interactive Canvas** for placing and arranging cargo items
- **Drag-and-drop** via a unified pointer gesture (mouse, touch, pen)
- **90° rotation** support for cargo items — rotating re-anchors the item around its visual center (the footprint does not jump), clamps the rotated footprint back inside the widget canvas, and leaves locked items untouched (BR-14/BR-15)
- **Grid snapping** for precise positioning
- **Free placement** — drag, drop, rotate and move cargo anywhere on the widget canvas; stacking cargo is allowed while planning (BR-46)
- **Canvas-safe placement** — items always stay fully inside the widget canvas so they can be grabbed again (BR-30b)
- **Proportional truck frame** — trucks that fit render at a fixed 297px frame height (the full canvas band) with the length scaled to the truck's true aspect; longer trucks cap the frame at 1453px and shrink the height. Every frame centers on the truck drawing's midline, and the truck drawing (background image) is identical for every truck — full canvas width, pinned to the canvas top — behind the frame
- **Strict Verify gate** — the Verify action re-checks overlap, truck-frame bounds and load meters (BR-45), while Auto Load packs against the truck frame
- **One-click finalize** — a passing Verify (BR-45) saves the PackingPlan and marks the TruckSelection `CompleteLoading = true` in one chain (BR-47); every failure is surfaced and never sets the flag
- **Planned loading order** — Auto Load reads the TruckSelection's `TransportOrderSequence` and gives the cabin-most slots to order 1, then order 2, so unloading follows the planned sequence (BR-24)
- **Rotation-aware load-meter (LM) validation** — counts a 90°/270° rotated cargo by the length it actually occupies along the truck
- **Front-weighted Auto Load** — larger cargo is packed toward the truck front (loading side) so the load's center of mass stays predictable — groundwork for axle/weight-distribution checks (BR-24)
- **Even wall loading** — partial stacks spread to both trailer walls (canvas top and bottom) so the load never hugs one side (BR-25)
- **Load/save packing plans** via Mendix Data API, with save failures surfaced in the info panel instead of failing silently
- **Auto Load** button that repacks all cargo tightly into the truck — an exact anytime optimizer for small loads, falling back to a bottom-left skyline heuristic beyond its unit limit
- **Remove cargo items** — remove a single placed instance from the canvas, returning it to the available cargo list
- **Grouped cargo list** — the units of one transport order are enclosed in a single 1px dashed border so each order's set is readable at a glance
- **Undo/redo history** for committed state transitions (per-gesture granularity for drags; one undo step covers a full drag operation)
- **Info panel** showing validation status, Auto Load leftovers, and save errors
- **Grid overlay** for visual guidance
- **Framework-agnostic engines** (drag, collision, snap) plus pure domain validation rules
- **Mendix 10 integration** via the `mx.data` API
- **Metric units** throughout — business data in meters/kilograms, converted to pixels through a single uniform scale

---

## Truck Frame Measurements (m → px)

Every truck renders against one fixed drawing — the background image (1275 × 271 px natural) at 100% canvas width (1800 × 382.59 px), pinned to the canvas top — identical for every truck. Only the frame (loading area) varies, through one uniform per-truck scale:

- **Fits** (`L × 297/W ≤ 1453`): scale = `297 / W` px/m → frame `L × scale` long × 297 px tall
- **Capped**: scale = `1453 / L` px/m → frame 1453 px long × `W × scale` tall
- Every frame starts at x = 333 and centers on the drawing midline (y = 191.29), inside the drawn bed band (y 42.35 → 341.65); cargo uses the same scale, so capacities keep true proportions

| Truck (TechnicalDetails) | Size (m) | Case | Scale (px/m) | Frame (px) | Position |
|---|---|---|---|---|---|
| Car ×3 | 0.60 × 0.90 | fits | 330.00 | 198 × 297 | (333, 42.79) |
| Van ×3 | 3.00 × 1.60 | fits | 185.63 | 556.88 × 297 | (333, 42.79) |
| Truck 20FT | 6.06 × 2.44 | fits | 121.72 | 737.63 × 297 | (333, 42.79) |
| Truck 12T ×4 | 10.00 × 2.40 | fits | 123.75 | 1237.50 × 297 | (333, 42.79) |
| Truck 40T ×5 | 12.192 × 2.350 | capped | 119.18 | 1453 × 280.06 | (333, 51.26) |
| Truck 40FT ×2 | 12.192 × 2.352 | capped | 119.18 | 1453 × 280.30 | (333, 51.14) |
| Truck Tautliner ×3 | 13.60 × 2.45 | capped | 106.84 | 1453 × 261.75 | (333, 60.42) |
| Truck and Hanger ×2 | 17.93 × 2.352 | capped | 81.04 | 1453 × 190.60 | (333, 95.99) |
| Truck 20T/20FT ADR ×3 | 20.00 × 2.352 | capped | 72.65 | 1453 × 170.87 | (333, 105.86) |
| Default fallback | 13.60 × 2.45 | capped | 106.84 | = Tautliner | (333, 60.42) |

Full derivation rules and per-truck DB names: [docs/MENDIX_ENTITY.md](docs/MENDIX_ENTITY.md#truck-rendering-measurements-m--px). Every value is locked by the fleet measurement suite in `src/infrastructure/adapters/__tests__/truckAdapter.spec.ts`.

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the complete architecture documentation, including:

- Layer structure (Core, Domain, State, Infrastructure, Presentation)
- Dependency direction and import rules
- Project structure and directory layout
- Data flow diagrams
- Testing strategy

---

## Project Structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for the complete directory structure. The codebase follows a 5-layer architecture:

- `src/core/` — Shared kernel (types, utilities, constants)
- `src/domain/` — Business logic (rules, engines, packing)
- `src/state/` — State management (CanvasController, StateManager, ActionDispatcher)
- `src/infrastructure/` — External integrations (Mendix bridge, adapters)
- `src/presentation/` — UI layer (hooks, components, widget)

---

## Data Flow

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed data flow diagrams, including:

- User interaction flow (drag, rotate, validate)
- Data loading flow (Mendix → Infrastructure → Domain → State → Presentation)
- Save flow (State → Infrastructure → Mendix)
- Auto Load flow (Domain packing rules → State update → UI re-render)

---

## Installation

```bash
# Install dependencies
npm install

# If using NPM v7.x.x, use legacy peer deps
npm install --legacy-peer-deps
```

---

## Development

```bash
# Start development server with HMR
npm start

# Or use the web dev server
npm dev

# Watch for code changes and auto-bundle the widget
# Changes will be included in the Mendix test project deployment folder
```

---

## Available Scripts

`package.json` is the single source of truth for the script list. The entry points used day to day:

- `npm start` / `npm dev` — pluggable-widgets-tools dev servers
- `npm run build` — build the widget for production
- `npm run lint` — lint the codebase
- `npm test` — run unit tests
- `npm run check:imports` — enforce the layer import bans
- `npm run check:docs` — verify documentation references still resolve

<!-- DOCS_SYNC:scripts-table:START -->
| Script | Command |
|--------|---------|
| `start` | `pluggable-widgets-tools start:server` |
| `dev` | `pluggable-widgets-tools start:web` |
| `build` | `pluggable-widgets-tools build:web` |
| `lint` | `pluggable-widgets-tools lint` |
| `lint:fix` | `pluggable-widgets-tools lint:fix` |
| `test` | `pluggable-widgets-tools test:unit:web:enzyme-free` |
| `test:unit` | `pluggable-widgets-tools test:unit:web:enzyme-free` |
| `test:contracts` | `pluggable-widgets-tools test:unit:web:enzyme-free --testPathPattern="__tests__/contracts"` |
| `test:integration` | `pluggable-widgets-tools test:unit:web:enzyme-free --testPathPattern="__tests__/integration"` |
| `test:scripts` | `vitest run scripts/__tests__` |
| `test:coverage` | `pluggable-widgets-tools test:unit:web:enzyme-free --coverage` |
| `check:imports` | `node scripts/check-imports.mjs` |
| `check:docs` | `node scripts/check-doc-links.mjs` |
| `check:changelog` | `node scripts/check-changelog.mjs` |
| `check:contracts` | `npm run test:contracts` |
| `check:integration` | `npm run test:integration` |
| `check:regression` | `node scripts/check-regression-coverage.mjs` |
| `docs:sync` | `node scripts/docs-sync.mjs` |
| `docs:check` | `node scripts/docs-check.mjs` |
| `prerelease` | `npm run lint` |
| `release` | `pluggable-widgets-tools release:web` |
| `prebuild` | `npm run docs:check` |
| `test:env` | `powershell -ExecutionPolicy Bypass -File ./start-test-env.ps1` |
| `test:env:verify` | `powershell -ExecutionPolicy Bypass -File ./start-test-env.ps1 -VerifyOnly` |
| `db:query` | `powershell -c "psql postgresql://mendix:mendix@localhost:5432/mendix -c \"$env:QUERY\""` |
| `db:tech-details` | `psql postgresql://mendix:mendix@localhost:5432/mendix -c "SELECT id, nameresource, combinationlength, combinationwidth FROM datamodelmodule$technicaldetails WHERE combinationlength > 0 OR combinationwidth > 0;"` |
| `db:trucks` | `psql postgresql://mendix:mendix@localhost:5432/mendix -c "SELECT ts.id, ts.truckindex, td.nameresource, td.combinationlength, td.combinationwidth FROM tcsloadingmeter$truckselection ts LEFT JOIN tcsloadingmeter$truckselection_resourceinstance tsri ON ts.id = tsri.tcsloadingmeter$truckselectionid LEFT JOIN tcstransportmodule$resourceinstance ri ON tsri.tcstransportmodule$resourceinstanceid = ri.id LEFT JOIN tcstransportmodule$resourceinstance_resource rir ON ri.id = rir.tcstransportmodule$resourceinstanceid LEFT JOIN datamodelmodule$resource r ON rir.datamodelmodule$resourceid = r.id LEFT JOIN datamodelmodule$resource_technicaldetails rtd ON r.id = rtd.datamodelmodule$resourceid LEFT JOIN datamodelmodule$technicaldetails td ON rtd.datamodelmodule$technicaldetailsid = td.id ORDER BY ts.truckindex;"` |
<!-- DOCS_SYNC:scripts-table:END -->

---

## Technology Stack

- **React** — pinned through `overrides`/`resolutions`, automatic JSX runtime
- **TypeScript** — strict mode with `erasableSyntaxOnly`, bundler module resolution
- **`@mendix/pluggable-widgets-tools`** — build pipelines: bundle, dev server with HMR, lint, unit tests, release
- **ESLint** — flat config with `typescript-eslint` and `eslint-plugin-react-hooks`
- **Jest + ts-jest** — unit test runner (jsdom environment)
- **Prettier** — code formatting
- **Rollup** — widget bundler, via pluggable-widgets-tools defaults

Exact versions are owned by `package.json`. See [docs/UPGRADE_GUIDE.md](docs/UPGRADE_GUIDE.md) for the tested compatibility matrix.

---

## Mendix Integration

### Widget Manifest

- `src/LoadingCanvas.xml` — Mendix widget manifest
- `src/package.xml` — widget package definition
- `typings/LoadingCanvasProps.d.ts` — generated widget typings

### Mendix Data API

Implemented under `src/infrastructure/mendix/` and exposed through `mendixDataAdapter.ts`:

- **Loading**: `mx.data.get()` with `guid`, `guids`, or `xpath`
- **Saving**: `mx.data.create()`, `mx.data.remove()`, `mx.data.commit()`
- **Actions**: `mx.data.action()` through `executeMendixAction`
- **Dev fallback**: loaders return mock MxObjects; there is no persistent local store

### PackingPlan Entity

The entity design, attributes, and save/load flow are owned by [docs/MENDIX_ENTITY.md](docs/MENDIX_ENTITY.md).

---

## Contributing

1. Install NPM package dependencies: `npm install` (or `npm install --legacy-peer-deps` for NPM v7.x.x)
2. Run `npm start` to watch for code changes
3. Follow the architecture guidelines in `ARCHITECTURE.md`
4. Write pure functions for domain rules and engines (no React/DOM dependencies)
5. Ensure TypeScript strict mode compliance
6. Submit pull requests with appropriate tests

---

## License

[Apache-2.0](LICENSE) © 2026 STCVN
