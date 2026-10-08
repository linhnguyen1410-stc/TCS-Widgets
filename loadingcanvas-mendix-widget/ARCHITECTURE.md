# LoadingCanvas Widget Architecture

## Overview

This repository implements a modular **LoadingCanvas** widget for drag-and-drop truck loading planning. Built with React and TypeScript on the Mendix pluggable-widgets-tools toolchain, the widget provides an interactive canvas where users can place, drag, rotate, and validate cargo items within a truck boundary.

The architecture follows a **Pragmatic Domain-Centric Architecture** — a layered architecture that places the business domain at the center while allowing practical cross-layer usage through a Shared Kernel (Core layer).

### Design Principles

1. **Domain is King** — Business logic is the most important part and has zero dependencies on infrastructure or UI frameworks
2. **Shared Kernel** — Pure utilities and types are shared across all layers without creating coupling
3. **Clear Dependency Direction** — Dependencies flow inward: Presentation → State → Domain → Core
4. **Framework Agnostic Domain** — Domain logic has zero React or Mendix dependencies
5. **Testable Isolation** — Each layer can be unit tested independently

---

## Architectural Style

### Why Pragmatic Domain-Centric?

Traditional Clean Architecture enforces strict layer isolation, but this is impractical for a single React/Mendix widget. The pragmatic version keeps the domain at the center with zero framework dependencies while allowing:

- Hooks to reach domain engines directly for performance (no redundant indirection).
- Pure utilities + shared types to be used by every layer through the Core Shared Kernel.
- The State layer to own a real, unit-testable interaction machine (manager + dispatcher + engines).

### Layered Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation Layer (src/presentation/)                      │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  Components     │  │  Hooks                           │   │
│  │  (Pure UI)      │  │  (State + Side Effects)         │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
│  Can depend on: State, Domain, Core                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  State Layer (src/state/)                                    │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  State Store    │  │  Action Handlers                │   │
│  │  (Single Source │  │  (Orchestration)                │   │
│  │   of Truth)     │  │                                 │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
│  Can depend on: Domain, Core                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Domain Layer (src/domain/)                                  │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  Business Rules │  │  Engines                        │   │
│  │  (Validation,   │  │  (Drag, Collision, Snap,        │   │
│  │   Geometry,     │  │   Packing)                      │   │
│  │   Rotation)     │  │                                 │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
│  Can depend on: Core ONLY                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Infrastructure Layer (src/infrastructure/)                  │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  Mendix Bridge  │  │  Data Adapters                  │   │
│  │  (mx.data API)  │  │  (Serialization)                │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
│  Can depend on: Domain, Core                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Core / Shared Kernel (src/core/)                            │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  Types          │  │  Utilities                      │   │
│  │  (Geometry,     │  │  (Coordinate Conversion,        │   │
│  │   ViewModels)   │  │   ID Manipulation)              │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
│  Can depend on: Nothing                                     │
└─────────────────────────────────────────────────────────────┘
```

<!-- DOCS_SYNC:layer-tree:START -->
### core/
├── __contracts__/
├── constants/
│   ├── canvas.ts
│   ├── card.ts
│   ├── cargoList.ts
│   ├── rotationHandle.ts
│   ├── theme.ts
├── types/
│   ├── assets.d.ts
│   ├── geometry.ts
│   ├── mx.d.ts
│   ├── Truck.ts
│   ├── viewModels/
│   │   ├── CargoItem.ts
│   │   ├── TruckItem.ts
├── utils/
│   ├── cargoId.ts
│   ├── coordinates.ts

### domain/
├── __contracts__/
├── engines/
│   ├── CollisionEngine.ts
│   ├── DragEngine.ts
│   ├── DragState.ts
│   ├── SnapEngine.ts
├── packing/
│   ├── packingOptimizer.ts
│   ├── packingRules.ts
├── rules/
│   ├── boundaryRules.ts
│   ├── dragRules.ts
│   ├── geometryRules.ts
│   ├── rotationRules.ts
│   ├── snapRules.ts
│   ├── validationRules.ts

### state/
├── __contracts__/
├── CanvasActionDispatcher.ts
├── CanvasController.ts
├── CanvasState.ts
├── CanvasStateListener.ts
├── CanvasStateManager.ts

### infrastructure/
├── __contracts__/
├── adapters/
│   ├── cargoAdapter.ts
│   ├── cargoLoader.ts
│   ├── planLoader.ts
│   ├── planRepository.ts
│   ├── planSaver.ts
│   ├── sequenceLoader.ts
│   ├── stateAdapter.ts
│   ├── transportOrderMeta.ts
│   ├── truckAdapter.ts
│   ├── truckLoader.ts
│   ├── truckSelectionSaver.ts
├── mendix/
│   ├── mendixAssociations.ts
│   ├── mendixDataAdapter.ts
│   ├── mendixLoaders.ts
│   ├── mendixMappers.ts
│   ├── mendixRuntime.ts
│   ├── mendixSchema.ts

### presentation/
├── __contracts__/
├── assets/
├── components/
│   ├── CanvasToolbar.tsx
│   ├── CargoCard.tsx
│   ├── CargoList.tsx
│   ├── CargoPopup.tsx
│   ├── CargoTooltip.tsx
│   ├── GridOverlay.tsx
│   ├── RotationHandle.tsx
├── hooks/
│   ├── coordinateRule.ts
│   ├── useCanvasActions.ts
│   ├── useCanvasState.ts
│   ├── useTruckCanvas.ts
├── widget/
│   ├── index.ts
│   ├── LoadingCanvas.container.tsx
│   ├── LoadingCanvas.properties.ts
│   ├── LoadingCanvasView.tsx
<!-- DOCS_SYNC:layer-tree:END -->

<!-- DOCS_SYNC:layer-map:START -->
- **core** → `src/core/`
- **domain** → `src/domain/`
- **state** → `src/state/`
- **infrastructure** → `src/infrastructure/`
- **presentation** → `src/presentation/`
<!-- DOCS_SYNC:layer-map:END -->

<!-- DOCS_SYNC:test-locations:START -->
- `src/__tests__`
- `src/core/__tests__`
- `src/core/utils/__tests__`
- `src/domain/__tests__`
- `src/domain/engines/__tests__`
- `src/domain/packing/__tests__`
- `src/domain/rules/__tests__`
- `src/infrastructure/__tests__`
- `src/infrastructure/adapters/__tests__`
- `src/infrastructure/mendix/__tests__`
- `src/presentation/__tests__`
- `src/presentation/components/__tests__`
- `src/presentation/hooks/__tests__`
- `src/state/__tests__`
<!-- DOCS_SYNC:test-locations:END -->

---

## Core Layer (src/core/)

### Purpose

The Core layer is the **Shared Kernel** — code that can be used by any layer with zero dependencies. It contains pure types, utility functions, and constants that are fundamental to the application.

### Key Types

#### geometry.ts

```typescript
export interface Point {
  x: number;
  y: number;
}
export interface Size {
  length: number;
  width: number;
}
export interface Positionable {
  x: number;
  y: number;
}
export interface Sizeable {
  length: number;
  width: number;
}
export interface Rotatable {
  rotation: Rotation;
}
export interface RectLike extends Positionable, Sizeable {}
export interface GeometryItem extends Positionable, Sizeable, Rotatable {}
export interface Rectangle {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export type Rotation = 0 | 90 | 180 | 270;
```

#### Truck.ts
```typescript
export interface Truck {
  id: string;
  code: string;
  internalLengthMeter: number;
  internalWidthMeter: number;
  internalHeightMeter: number;
  maxPayloadKg: number;
  axleCount: number;
  truckType: "Tauliner" | "DryVan" | "Reefer" | "Flatbed" | "Container" | "Curtainsider";
  maxLoadMeters?: number; // Maximum load meters along truck length
}
```

#### Truck frame measurements (m → px)

`truckAdapter.computeScale` converts `TechnicalDetails` meters to pixels through one uniform per-truck scale; `truckSelectionToTruckItem` sizes and places the frame. One drawing serves every truck — the background image (1275 × 271 px natural) at 100% canvas width (1800 × 382.59 px), pinned to the canvas top — so only the frame varies:

- **Fits** (`L × 297/W ≤ 1453`): scale = `297 / W` px/m → frame `L × scale` long × 297 px tall
- **Capped**: scale = `1453 / L` px/m → frame 1453 px long × `W × scale` tall
- Frame x = 333 (`TRUCK_CANVAS_LEFT`, also the load-meter front); frame y = `191.29 − height/2` (`TRUCK_DRAWING_MIDLINE_Y`), inside the drawn bed band (y 42.35 → 341.65); cargo uses the same scale

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

Full derivation rules and per-truck DB names: [docs/MENDIX_ENTITY.md](docs/MENDIX_ENTITY.md#truck-rendering-measurements-m--px). Every value is locked by the fleet suite in `src/infrastructure/adapters/__tests__/truckAdapter.spec.ts`.

#### viewModels/CargoItem.ts

```typescript
import type { GeometryItem } from "../geometry";
export type CargoType = "pallet" | "box";
export interface CargoItem extends GeometryItem {
  id: string;
  name: string;
  type: CargoType;
  color: string;
  isLocked: boolean;
  lengthM?: number;
  widthM?: number;
  weightKg?: number;
  quantity?: number;
  transportOrderNo?: string;
  productName?: string;
  producerName?: string;
  companyFromName?: string;
  companyToName?: string;
}
```

### Key Utilities

#### coordinates.ts

```typescript
export const meterToPixel = (meter: number, scale: number): number => meter * scale;
export const pixelToMeter = (pixel: number, scale: number): number => pixel / scale;
```

#### cargoId.ts

```typescript
export const CARGO_ID_PREFIX = "cargo-";
export const toCargoId = (id: string): string =>
  id.startsWith(CARGO_ID_PREFIX) ? id : `${CARGO_ID_PREFIX}${id}`;
export const fromCargoId = (id: string): string => {
  if (!id.startsWith(CARGO_ID_PREFIX)) return id;
  const withoutPrefix = id.slice(CARGO_ID_PREFIX.length);
  const dashIndex = withoutPrefix.lastIndexOf("-");

---

## Domain Layer (src/domain/)

### Purpose

The Domain layer is the **heart of the application**. It contains all business logic: validation rules, geometry calculations, packing algorithms, and interaction engines. This layer has **zero dependencies** on React, Mendix, or browser APIs.

### Business Rules (src/domain/rules/)

| File | Functions | Purpose |
|------|-----------|---------|
| boundaryRules.ts | clamp, getCanvasBounds, getTruckBounds, getTruckBoundsFromItem | Boundary calculations |
| geometryRules.ts | getRectangle, isIntersecting, overlaps, isInsideBounds, findCollisions | Geometry operations |
| validationRules.ts | validateItem, validateLoadMeters, validateAll | Validation logic |
| rotationRules.ts | rotate90, isVerticalRotation, getRotatedScreenSize, rotateKeepingCenter | Rotation logic |
| dragRules.ts | calculateDragPosition | Drag calculations |
| snapRules.ts | snapToGrid, snapPosition | Snap calculations |

### Engines (src/domain/engines/)

Engines orchestrate domain rules to implement complex behaviors:

#### DragEngine<T>
- Manages drag state (start positions, offsets, active item)
- `startDrag(activeId, selectedIds, mouse)` — Begins drag operation
- `move(mouse, canvasWidth, canvasHeight, scale, bounds)` — Updates positions during drag
- `rotateItem(itemId, bounds, scale)` — Rotates item with collision resolution
- `endDrag()` — Ends drag operation
- `updateItems(items)` — Syncs internal items with external state

#### CollisionEngine
- `detectCollisions(item, others, scale)` — Detects collisions
- `findValidPositions(item, others, bounds, snapDistance, scale)` — Finds valid positions
- `resolveNonOverlappingPosition(item, desiredPos, startPos, others, bounds, scale)` — Resolves to valid position

#### SnapEngine
- `calculateSnapTarget(item, others, position, options)` — Calculates snap target

### Packing (src/domain/packing/)

#### packingRules.ts
- `packCargoIntoBounds(items, bounds, scale, options)` — Packs cargo into bounds
- `autoLoadCargoUnits(onCanvas, stillInList, placedInstances)` — Auto-loads cargo units
- `expandCargoByQuantity(cargo)` — Expands cargo by quantity
- Large loads run the left-anchored skyline in both orientation orders (upright-first
  and rotated-first), keeping the rotated result only on a strictly higher placed
  count; the walls-inward post-pass then re-slots partial columns to both side walls
  (collision-checked, keeps original positions on conflict)
- Capacity anchor: the capped 13.6 LM tautliner frame fits 34 EUR pallets in the
  geometric model (2 rotated lanes × 17 columns at exactly 13.6 LM; a 33-pallet load
  keeps the upright 3-lane layout) — pinned by the tautliner capacity describe in the
  auto-load integration spec

#### packingOptimizer.ts
- `optimizePacking(items, bounds, scale, options)` — Exact packing optimization
- Uses branch-and-bound algorithm for optimal placement
- Maximizes placed units, then prefers larger cargo nearer the loading front (area-weighted front bias — monotone, so branch-and-bound pruning is preserved), then minimizes used length/width/rotations
  if (dashIndex > 0 && /^\d+$/.test(withoutPrefix.slice(dashIndex + 1))) {
    return withoutPrefix.slice(0, dashIndex);
  }
  return withoutPrefix;
};
export const getCargoInstanceIndex = (id: string): number => {
  if (!id.startsWith(CARGO_ID_PREFIX)) return 0;

---

## State Layer (src/state/)

### Purpose

The State layer manages application state and orchestrates domain objects. It serves as the **single source of truth** for the UI and coordinates all state mutations.

### Directory Structure

```

src/state/
├── CanvasState.ts # State interface definition
├── CanvasStateManager.ts # State management with undo/redo
├── CanvasStateListener.ts # Listener type for subscriptions
├── CanvasActionDispatcher.ts # Action routing and orchestration
└── CanvasController.ts            # Interaction machine facade (owns manager + dispatcher + engines)`n├── CanvasController.ts            # Interaction machine facade (owns manager + dispatcher + engines)

````

### Rules

1. **Domain + Core dependencies** — Can import from `src/domain/` and `src/core/`
2. **Single source of truth** — All application state lives here
3. **No business logic** — Orchestrates domain objects but doesn't contain business rules
4. **No direct UI manipulation** — Notifies listeners, doesn't render
5. **No direct Mendix calls** — Delegates to infrastructure layer

### Key Components

#### CanvasState Interface
```typescript
import type { CargoItem } from "../core/types/viewModels/CargoItem";
import type { TruckItem } from "../core/types/viewModels/TruckItem";
import type { ValidationResult } from "../domain/rules/validationRules";

export interface CanvasState {
  truck: TruckItem | null;
  cargos: CargoItem[];
  selectedIds: string[];
  activeItemId: string | null;
  validation: ValidationResult;
  scale: { widthScale: number; heightScale: number };
}
````

#### CanvasStateManager

- `getState()` — Returns deep-cloned current state
- `setState(nextState)` — Updates state with history tracking
- `updateState(update)` — Updates state via function
- `setStateTransient(nextState)` — Updates state without history (for drag frames)
- `subscribe(listener)` — Subscribes to state changes
- `undo()` — Undoes last state change
- `redo()` — Redoes last undone change

#### CanvasActionDispatcher

#### CanvasController

The main facade for the interaction machine. Owns the state manager, action dispatcher, and domain engines (DragEngine, CollisionEngine, SnapEngine). Hooks are thin React adapters over this controller.

- `getState()` — Returns current state from the manager
- `subscribe(listener)` — Subscribes to state changes
- `dispatch(action)` — Routes actions to the dispatcher
- `startDrag(activeId, mouse)` — Begins a drag operation
- `move(mouse)` — Updates drag position
- `endDrag()` — Ends drag operation
- `rotate(itemId)` — Rotates an unlocked item 90° clockwise through `DragEngine.rotateItem` (center re-anchored, footprint clamped into the widget canvas); locked items keep their pose (BR-15)
- `addItem(item)` — Adds item to canvas
- `setItems(items)` — Replaces all items
- `removeItem(itemId)` — Removes the item with that exact canvas id
- `undo()` / `redo()` — History navigation

---

## Infrastructure Layer (src/infrastructure/)

### Purpose

The Infrastructure layer handles **external system integrations** and **data transformations**. It is the **only layer** allowed to interact with the Mendix runtime.

### Directory Structure

```
src/infrastructure/
├── mendix/                        # Mendix-specific integration code
│   ├── mendixRuntime.ts           # mx.data detection, GUID, Decimal helpers
│   ├── mendixLoaders.ts           # mx.data load/commit wrappers
│   ├── mendixAssociations.ts      # Association filtering
│   ├── mendixMappers.ts           # MxObject → plain object mapping
│   └── mendixSchema.ts            # Entity/association/attribute constants
└── adapters/                      # Data mapping and serialization
    ├── cargoAdapter.ts            # PackingUnit → CargoItem mapping
    ├── truckAdapter.ts            # TruckSelection → TruckItem mapping
    ├── stateAdapter.ts            # CanvasState ↔ PackingPlanData
    ├── cargoLoader.ts             # Load TransportOrders from Mendix
    ├── truckLoader.ts             # Load TruckSelection from Mendix
    ├── transportOrderMeta.ts      # Load TO metadata
    ├── planRepository.ts          # Load/save PackingPlan
    ├── truckSelectionSaver.ts    # TruckSelection CompleteLoading flag write (BR-47)
    ├── sequenceLoader.ts         # TransportOrderSequence -> OrderSequence per TransportOrder (BR-24)
    └── mendixDataAdapter.ts       # Public facade for Mendix Data API
```

### Rules

1. **Domain + Core dependencies** — Can import from `src/domain/` and `src/core/`
2. **Mendix gateway** — Only layer allowed to call Mendix runtime APIs
3. **Data transformation** — Converts between Mendix and domain formats
4. **No business logic** — Uses domain rules but doesn't implement them
5. **No direct UI manipulation** — Returns data, doesn't render

### Mendix Bridge (src/infrastructure/mendix/)

| File                  | Functions                                                                                | Purpose                       |
| --------------------- | ---------------------------------------------------------------------------------------- | ----------------------------- |
| mendixRuntime.ts      | isMendixRuntime, getMx, getObjectGuid, isMxObject, setMxAttribute, setMxDecimalAttribute | Runtime detection and helpers |
| mendixLoaders.ts      | loadMendixObject, loadMendixObjects, loadMendixList, executeMendixAction                 | Data loading                  |
| mendixAssociations.ts | getReferenceGuids, filterByAssociationGuid                                               | Association handling          |

---

## Presentation Layer (src/presentation/)

### Purpose

The Presentation layer contains **React components and hooks**. It is a thin UI layer that renders state and captures user interactions.

### Directory Structure

```
src/presentation/
├── hooks/                         # React hooks
│   ├── useTruckCanvas.ts          # Main canvas hook (engines + state)
│   ├── useCanvasState.ts          # State subscription hook
│   ├── useCanvasActions.ts        # Action dispatcher hook
│   ├── useMouseEvents.ts          # Mouse event handling
│   └── coordinateRule.ts          # Canvas coordinate conversion
├── components/                    # Presentational components
│   ├── CargoCard.tsx              # Single cargo item rendering
│   ├── CargoList.tsx              # Available cargo list
│   ├── CargoPopup.tsx             # Cargo detail popup
│   ├── CargoTooltip.tsx           # Cargo hover tooltip
│   ├── GridOverlay.tsx            # Grid overlay
│   └── RotationHandle.tsx         # Rotation handle
└── widget/                        # Widget container
    ├── LoadingCanvas.tsx              # Mendix entry point
    ├── LoadingCanvas.container.tsx     # Data loading container
    ├── LoadingCanvasView.tsx          # Main view component
    ├── LoadingCanvas.properties.ts     # Props interface
    ├── LoadingCanvas.editorConfig.ts    # Editor configuration
    ├── LoadingCanvas.editorPreview.tsx  # Editor preview
    ├── LoadingCanvas.xml               # Widget manifest
    └── index.ts                       # Public exports
```

### Rules

1. **State + Domain + Core dependencies** — Can import from any layer
2. **Thin components** — Components are pure (props in, UI out)
3. **Hooks delegate** — Business logic in hooks delegates to state/domain
4. **No direct Mendix calls** — Uses infrastructure layer via container
5. **No business logic duplication** — Reuses domain rules

---

## Dependency Rules

### Allowed Dependencies Matrix

| Layer              | Core | Domain | State | Infrastructure | Presentation |
| ------------------ | ---- | ------ | ----- | -------------- | ------------ |
| **Core**           | ✅   | ❌     | ❌    | ❌             | ❌           |
| **Domain**         | ✅   | ✅     | ❌    | ❌             | ❌           |
| **State**          | ✅   | ✅     | ✅    | ❌             | ❌           |
| **Infrastructure** | ✅   | ✅     | ❌    | ✅             | ❌           |
| **Presentation**   | ✅   | ✅     | ✅    | ❌             | ✅           |

### Dependency Direction Diagram

```
                    ┌──────────────────┐
                    │   Shared Kernel   │
                    │   (core/)         │
                    └──────────────────┘
                         ▲     ▲
                         │     │
            ┌────────────┘     └────────────┐
            │                               │
            ▼                               │
┌───────────────────────┐                   │
│   Domain Layer        │                   │
│   (domain/)           │                   │
└───────────────────────┘                   │
            ▲                               │
            │                               │
            │         ┌─────────────────────┘
            │         │
            ▼         ▼
┌───────────────────────┐
│   State Layer         │
│   (state/)            │
└───────────────────────┘
            ▲
            │
            ▼
┌───────────────────────┐
│   Presentation Layer  │
│   (presentation/)     │
└───────────────────────┘

┌───────────────────────┐
│   Infrastructure      │◄──── Can use Domain + Core

---

## Data Flow

### User Interaction Flow

```

User Action → Component → Hook → ActionDispatcher → StateManager
│ │
│ ▼
│ Domain Engine
│ │
│ ▼
│ Domain Rules
│ │
▼ ▼
Re-render State Update

```

### Data Loading Flow

```

Mendix Runtime → mendixLoaders → Adapters → Domain Rules → View Models → State

```

### Save Flow

```

State → Adapters → mendixMappers → mendixLoaders → Mendix Runtime

```

### Auto Load Flow

```

User Action → Hook → ActionDispatcher → Domain Packing Rules → State → Re-render

```

---

## Testing Strategy

### Test File Location

Tests live alongside the code they test:
```

src/core/utils/__tests__/coordinates.spec.ts
src/domain/rules/__tests__/validationRules.spec.ts
src/domain/engines/__tests__/DragEngine.spec.ts
src/state/__tests__/CanvasStateManager.spec.ts

---

## Build & Tooling

- **`@mendix/pluggable-widgets-tools`** — all pipelines (bundle, dev server, lint, tests, release)
- **Rollup** — widget bundler under the hood of pluggable-widgets-tools
- **React** — pinned through `overrides`/`resolutions`, automatic JSX runtime
- **TypeScript** — strict mode, bundler module resolution
- **ESLint** — flat config with typescript-eslint and react-hooks
- **Jest + ts-jest** — unit test runner via `test:unit:web:enzyme-free`
- **Prettier** — code formatting
- **docs-check gate** — `npm run docs:check` (`scripts/docs-check.mjs`) runs as the `prebuild` step; it enforces the trigger matrix in `scripts/docs-rules.mjs` (source changes require the matching documentation and a `CHANGELOG.md` entry in the same working tree) plus doc-link and import-ban checks

Exact versions are owned by `package.json`; the tested compatibility matrix lives in
[docs/UPGRADE_GUIDE.md](docs/UPGRADE_GUIDE.md).

---

## Mendix Integration

### Widget Manifest

- **`src/LoadingCanvas.xml`** — Mendix widget manifest
- **`src/package.xml`** — Widget package definition
- **`src/core/types/mx.d.ts`** — TypeScript declarations for Mendix framework
- **`typings/LoadingCanvasProps.d.ts`** — Generated widget typings (regenerated by the build; ignored by Prettier)

### Mendix Data API

The `src/infrastructure/mendix/mendixDataAdapter.ts` module is the public facade over the Mendix Data API:

- **Loading**: `mx.data.get()` with `guid`, `guids`, or `xpath` (`src/infrastructure/mendix/mendixLoaders.ts`)
- **Saving**: `mx.data.create()`, `mx.data.remove()`, and `mx.data.commit()` to persist packing plans
- **Actions**: `mx.data.action()` through `executeMendixAction`
- **Dev fallback**: with no `mx` present, loaders return mock MxObjects (`createMockMxObject`) and `loadMendixList` parses its XPath argument as JSON. There is no persistent local store — a save with no runtime returns the serialized plan and calls the microflow callback only.

### PackingPlan Entity

See [docs/MENDIX_ENTITY.md](docs/MENDIX_ENTITY.md) for the full entity design.

- **PackingPlan** (1 per TruckSelection) — stores the plan header
- **PackingPlanItem** (1-* per plan) — stores individual item positions
- **Save flow**: Find-or-create plan → Delete existing items → Create new items → Commit
- **Load flow**: Query PackingPlan → Query PackingPlanItems → Resolve associations → Deserialize

---

## Notes

- Domain rules and engines are framework-agnostic — they have no React or Mendix dependencies
- The `useCanvasState` and `useCanvasActions` hooks expose the state manager cleanly to React components
- The `Truck` business model uses metric units (meters, kg); the canvas view layer uses pixels
- The `src/core/utils/coordinates.ts` module provides conversion helpers used by all layers
- This architecture supports future export/import, undo/redo, and Mendix data sync
- The packing optimizer in `src/domain/packing/packingOptimizer.ts` uses a branch-and-bound algorithm for optimal placement
- The cargo list and the canvas are overlapping drop zones: the list is rendered inside the canvas container. The unified pointer gesture resolves the target explicitly — `useTruckCanvas.handlePointerUp` hit-tests `listPanelRef` first (`isPointInRect`), so a release over the list returns the cargo (BR-30a) and the canvas add/move path never also runs for the same gesture. Removing the list-first hit-test re-introduces a bug where a list drop both removes and re-adds the item (B-0008).
- Two coordinate systems coexist: item `x`/`y` are **data (scene) coordinates** rendered inside the container translated by `truckBackdrop.sceneOffset`, while browser events give **widget-canvas coordinates**. The truck drawing (backdrop image) is fixed for every truck — 100% canvas width, pinned to the canvas top (`center top`), with frames centered vertically on `TRUCK_DRAWING_MIDLINE_Y` — and `sceneOffset` is pinned to `{0,0}`, so data coordinates render 1:1; the offset plumbing is retained so the drop/click conversion stays future-proof. Every drop entry point must convert event coordinates through `getDropDataPoint` (hooks layer), which clamps the rendered position fully inside the widget canvas before subtracting the scene offset. Storing raw event coordinates re-introduces a bug where cargo can be dropped completely outside the visible canvas (clipped by `overflow: hidden`) and can no longer be grabbed.
- The grab offset travels with the gesture: the card/chip records where inside it the pointer went down, `useTruckCanvas` re-applies it on every pointer move, and the drop settles through `ADD_ITEM`/`MOVE_ITEM` at that exact position, so a card lands under the mouse instead of jumping top-left to the cursor (B-0009). Dropping the grab offset re-introduces the jump-by-grab-size bug.
- Canvas-card gestures convert once at the hook boundary (`getCanvasPoint` → `toDataPoint`, i.e. `R - S`) before reaching `CanvasController`/`DragEngine`, which stay in pure data space; the grab offset is re-applied on move so mouse and pointer paths share one math. Feeding raw rendered coords into the dispatcher re-introduces the edge dead-zone from the scene-offset clamp mismatch.
- Click-to-add has no mouse point, so its default must already be a safe data-space position: `getClickAddDataPoint` (hooks layer) returns the data point rendering at (`OVERFLOW_MARGIN`, `OVERFLOW_MARGIN`), computed as margin minus `sceneOffset`, so a full-truck click parks the card outside the truck at the widget's top-left. Passing raw widget-space constants (e.g. 50,50) re-introduces an off-canvas item once sceneOffset shifts rendering.
- Manual placement runs in **free placement** (BR-46): `CanvasController` enables `DragEngine.setAllowOverlap(true)` once, so gestures bypass collision resolution and may stack cargo or park it outside the truck, and the dispatcher validates against `getCanvasBounds` with `allowOverlap: true` (load meters and canvas escapes are still reported). The strict geometric gate is the **Verify** button in `CanvasToolbar`, which re-runs `validationRules.validateAll` against the truck band with overlap detection (BR-45). Reinstating guarded placement means flipping the engine flag, not re-adding collision resolves at call sites.
- The cargo list groups the units of one transport order under a single dashed enclosure: the DOM is panel → group(order) → chip. Each group is keyed by its availableItems entry id (`cargo.id`) while placed-instance tracking uses the suffix-stripped base id from `fromCargoId`. Keying the group by `fromCargoId` instead re-introduces a React duplicate-key warning, because it strips a trailing numeric suffix and collides for ids that differ only by that suffix.