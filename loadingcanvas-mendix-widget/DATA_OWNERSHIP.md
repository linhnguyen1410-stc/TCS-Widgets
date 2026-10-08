# Data Ownership — LoadingCanvas Widget

> **Purpose:** Single Source of Truth for data ownership, state responsibility,
> persistence responsibility, and data lifecycle across the LoadingCanvas widget.
>
> This document answers:
>
> 1. Who owns each important piece of data?
> 2. Where is the authoritative value?
> 3. Which values are derived?
> 4. Which values are temporary working state?
> 5. Which values are persisted?
> 6. Which layer is allowed to read or modify them?
>
> This document does **not** duplicate business rules or Mendix entity
> definitions.
>
> - Business behavior → `BUSINESS_RULES.md`
> - Architecture/layers → `ARCHITECTURE.md`
> - Feature ownership/dependencies → `FEATURE_MAP.md`
> - Mendix entities/attributes/associations → `docs/MENDIX_ENTITY.md`

---

## 1. Ownership Model

Every important data object must belong to exactly one ownership category.

| Category | Meaning | Examples |
|---|---|---|
| **Source of Truth** | Authoritative external/business data | `TruckSelection`, `TransportOrder`, `PackingUnit`, `PackingType` |
| **Derived State** | Calculated from authoritative data | truck scale, load meter, validation result |
| **Working State** | Temporary state used while interacting | `CanvasState`, selection, drag state |
| **Persisted State** | State intentionally stored for later restoration | `PackingPlan`, `PackingPlanItem` |
| **UI State** | Presentation-only state | loading indicators, save error, transient messages |

### Ownership rule

A derived or working value must never become an independent competing
source of truth.

```text
Source of Truth
      ↓
Normalized View Model
      ↓
Working State
      ↓
Derived Validation / Calculations
      ↓
Persisted State
```

---

# 2. Global Data Ownership

```text
Mendix Domain Model
        │
        ├── TruckSelection
        │      ├── ResourceInstance
        │      │      └── Resource
        │      │             └── TechnicalDetails
        │      │
        │      └── TransportOrderSequence
        │             └── TransportOrder
        │                    └── PackingUnit
        │                           └── PackingType
        │
        ▼
Infrastructure Adapters
        │
        ▼
Normalized View Models
        │
        ├── TruckItem
        └── CargoItem
        │
        ▼
CanvasState
        │
        ├── Placement
        ├── Rotation
        ├── Selection
        └── Interaction state
        │
        ▼
Verification
        │
        ▼
PackingPlanData
        │
        ▼
PackingPlan / PackingPlanItem
        │
        ▼
TruckSelection.CompleteLoading
```

The widget must not bypass this ownership chain.

---

# 3. Source of Truth

## 3.1 TruckSelection

**Owner:** Mendix / Infrastructure boundary

`TruckSelection` is the authoritative business context for the current
loading operation.

It owns:

- selected truck context
- current TransportOrder membership
- `CompleteLoading`

The widget may read these values through Infrastructure adapters.

The widget must not create a second independent business representation
of truck-selection status.

### CompleteLoading

`TruckSelection.CompleteLoading` is the authoritative completion flag.

Ownership:

```text
Verify
  ↓
Save PackingPlan
  ↓
markTruckSelectionCompleteLoading
  ↓
TruckSelection.CompleteLoading = true
```

Rules:

- The widget may set `CompleteLoading = true` only through the dedicated
  Infrastructure operation.
- `CompleteLoading` must never be set to `true` before the PackingPlan
  has been saved successfully.
- The widget must not clear `CompleteLoading`.
- Clearing/resetting the business completion state belongs to the
  surrounding Mendix business process.
- `CompleteLoading` must not be duplicated as a persistent property of
  `CanvasState`.

---

## 3.2 Truck Dimensions

**Source of Truth:**

```text
TruckSelection
  → ResourceInstance
  → Resource
  → TechnicalDetails
```

Authoritative values include:

- combination length
- combination width
- truck/resource identity

Infrastructure converts these values into the normalized `TruckItem`.

The normalized `TruckItem` is a **view model**, not a replacement
business source of truth.

---

## 3.3 Transport Orders

**Source of Truth:** Mendix `TransportOrder`

TransportOrder membership is determined by the current
`TruckSelection` → `TransportOrderSequence` relationship.

The widget must not infer membership from:

- canvas position
- array index
- saved PackingPlan rows
- previous widget state

Cargo identity must remain keyed by stable TransportOrder GUID.

---

## 3.4 Packing Units / Packing Types

**Source of Truth:**

```text
TransportOrder
  → PackingUnit
  → PackingType
```

Physical cargo properties originate from Mendix:

- length
- width
- height
- weight
- packing type

The widget may normalize them into `CargoItem`.

`CargoItem` is not authoritative business master data.

---

# 4. Normalized View Models

Infrastructure owns conversion from Mendix objects into widget view models.

Primary models:

```text
TruckItem
CargoItem
```

Ownership:

```text
Mendix objects
    ↓
Infrastructure adapters
    ↓
TruckItem / CargoItem
```

Rules:

- View models contain only data required by the widget.
- Presentation must consume view models rather than raw `MxObject`.
- Domain logic must not depend on Mendix object APIs.
- Changes to Mendix associations and raw attributes remain inside
  Infrastructure.

---

# 5. Canvas Working State

**Owner:** `CanvasState`

`CanvasState` is the authoritative working state while the user is
editing the loading arrangement.

It owns:

- current truck view model
- current cargo items
- placed/unplaced state
- item positions
- item rotations
- selection
- active item
- interaction-related state required by the state machine

Primary implementation:

```text
src/state/CanvasState.ts
src/state/CanvasStateManager.ts
src/state/CanvasController.ts
src/state/CanvasActionDispatcher.ts
```

### Important distinction

```text
CanvasState
    ≠
PackingPlan
```

`CanvasState` represents the **current working arrangement**.

`PackingPlan` represents the **persisted arrangement**.

---

# 6. Interaction State

Transient interaction state belongs to the interaction/state layer.

Examples:

- dragging
- active pointer
- temporary drag position
- group selection
- resize/rotation interaction
- transient preview position

Rules:

- Interaction state must not be persisted directly.
- Temporary pointer state must not become business data.
- A cancelled interaction must not modify persisted state.
- Domain engines may calculate transient results but must not own
  application persistence.

---

# 7. Derived State

Derived values have no independent ownership.

Examples:

- truck scale
- pixel dimensions
- load meter
- collision result
- boundary result
- verification result
- placement status
- validation errors
- used truck length
- rendered positions

Ownership pattern:

```text
Source / Working State
        ↓
Domain calculation
        ↓
Derived result
```

Derived values must be recalculated when their inputs change.

They must not be persisted unless explicitly defined as business data.

---

# 8. PackingPlanData

`PackingPlanData` is a persistence DTO.

It is **not** the source of truth for the live canvas.

Purpose:

```text
CanvasState
    ↓
serializePlan()
    ↓
PackingPlanData
    ↓
Mendix persistence
```

and:

```text
Mendix persistence
    ↓
PackingPlanData
    ↓
deserializePlan()
    ↓
CanvasState
```

Ownership:

**Infrastructure serialization boundary.**

`PackingPlanData` exists to isolate persistence representation from the
live working state.

---

# 9. PackingPlan

**Source of Truth after persistence:** Mendix `PackingPlan`

A PackingPlan belongs to one `TruckSelection`.

Current business model:

```text
TruckSelection
    │
    └── 1 PackingPlan
             │
             └── * PackingPlanItem
```

There is no widget-side independent PackingPlan database.

The widget may maintain a working representation but the persisted
PackingPlan remains owned by Mendix persistence.

---

# 10. PackingPlanItem

`PackingPlanItem` is the persisted representation of one cargo placement.

It owns persisted placement information such as:

- TransportOrder reference
- position
- footprint
- rotation
- optional physical metadata

The TransportOrder reference must remain stable and GUID-based.

Array order is not an identity mechanism.

---

# 11. Save Ownership

The save boundary is:

```text
Presentation
    ↓
save request
    ↓
Infrastructure
    ↓
serialize CanvasState
    ↓
PackingPlanData
    ↓
PackingPlan / PackingPlanItem
```

Primary implementation:

```text
src/infrastructure/adapters/planSaver.ts
src/infrastructure/adapters/planRepository.ts
```

### Save rule

Saving replaces the persisted arrangement with the current valid
working arrangement.

Current strategy:

```text
Find PackingPlan
      ↓
Delete existing PackingPlanItems
      ↓
Create current PackingPlanItems
      ↓
Commit
```

The persistence operation must preserve the invariant:

> A successfully completed save represents the current canvas arrangement.

If the underlying Mendix operation cannot guarantee atomicity, the
transaction/partial-failure behavior must be documented before changing
the save mechanism.

---

# 12. Load Ownership

Load direction:

```text
Mendix PackingPlan
      ↓
Infrastructure
      ↓
PackingPlanData
      ↓
deserializePlan()
      ↓
CanvasState
```

Primary implementation:

```text
src/infrastructure/adapters/planLoader.ts
```

The saved plan is restored only for TransportOrders that are currently
valid for the selected TruckSelection when the current order set is
supplied.

Therefore:

```text
Persisted historical plan
        +
Current TruckSelection
        ↓
Current valid working state
```

A saved item for a TransportOrder that is no longer part of the current
TruckSelection must not be restored onto the canvas.

---

# 13. Serialization Ownership

Coordinate conversion has two representations:

```text
Canvas representation
        ↓
pixels
```

and:

```text
Persistence representation
        ↓
meters
```

The conversion boundary belongs to the adapter/serialization layer.

Rules:

- Canvas coordinates are working/UI representation.
- Meter coordinates are persistence representation.
- Persistence must not store pixel coordinates.
- Domain calculations must use the representation appropriate to the
  domain contract.
- Conversion must use the current truck-specific scale.

---

# 14. Validation Ownership

Validation is derived from current working state.

```text
CanvasState
    +
TruckItem
    +
CargoItem
    ↓
Domain validation
    ↓
ValidationResult
```

ValidationResult is derived data.

It does not own:

- TruckSelection
- TransportOrder
- PackingPlan
- CompleteLoading

Verification determines whether the current arrangement is eligible for
finalization.

---

# 15. Verify → Save → CompleteLoading Lifecycle

The finalization lifecycle is:

```text
WORKING
   │
   │ Verify
   ▼
VERIFIED
   │
   │ Save PackingPlan
   ▼
PERSISTED
   │
   │ markTruckSelectionCompleteLoading
   ▼
COMPLETE
```

Required ordering:

```text
1. Verify current CanvasState
2. Save PackingPlan successfully
3. Set TruckSelection.CompleteLoading = true
```

Forbidden ordering:

```text
Verify
  ↓
CompleteLoading = true
  ↓
Save PackingPlan
```

because this can produce:

```text
CompleteLoading = true
PackingPlan = not successfully persisted
```

The completion flag must therefore be treated as a business-state
commit marker, not as a UI validation result.

---

# 16. Ownership Boundaries by Layer

| Layer | May own | Must not own |
|---|---|---|
| Core | contracts, geometry primitives, constants | Mendix objects, persistence |
| Domain | business calculations, rules, validation | React state, Mendix API |
| State | working CanvasState, interaction orchestration | persisted database state |
| Infrastructure | Mendix data, adapters, persistence | React rendering |
| Presentation | UI state and rendering | business source of truth |
| Mendix | persisted business data | widget working state |

---

# 17. Data Mutation Rules

### Rule 1 — One authoritative owner

Every mutable business datum must have one authoritative owner.

### Rule 2 — Derived values are disposable

Derived values may be recalculated at any time from authoritative inputs.

### Rule 3 — Working state is not persistence

Changing `CanvasState` does not imply that Mendix data has changed.

### Rule 4 — Persistence is explicit

Only an explicit save operation may modify the PackingPlan.

### Rule 5 — Completion is explicit

Only the finalization chain may set `CompleteLoading`.

### Rule 6 — UI cannot mutate business data directly

Presentation must use callbacks/services/adapters.

### Rule 7 — Identity is stable

GUIDs, not array indexes or visual positions, define business-object
identity.

---

# 18. Data Lifecycle

```text
                    ┌──────────────────┐
                    │ Mendix Source    │
                    │ of Truth         │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Infrastructure   │
                    │ Normalization    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Working State    │
                    │ CanvasState      │
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
                    ▼                  ▼
              Domain Rules        UI Rendering
                    │
                    ▼
              Verify Result
                    │
                    ▼
             serializePlan()
                    │
                    ▼
              PackingPlan
                    │
                    ▼
             CompleteLoading
```

---

# 19. Feature-to-Data Ownership

| Feature | Primary data owner | Data category |
|---|---|---|
| F01 Truck Context | Mendix TruckSelection chain | Source of Truth |
| F02 Truck Rendering | TruckItem + scale calculation | Derived |
| F03 Cargo Loading | Mendix TransportOrder/PackingUnit | Source of Truth |
| F04 Cargo List | Canvas working state | Working State |
| F05 Placement | CanvasState | Working State |
| F06 Drag | CanvasState + transient interaction | Working State |
| F07 Group Drag | CanvasState | Working State |
| F08 Rotation | CanvasState | Working State |
| F09 Snap | Domain calculation | Derived |
| F10 Collision | Domain calculation | Derived |
| F11 Load Meter | Domain calculation | Derived |
| F12 Auto Load | CanvasState result | Working State |
| F13 Verify | ValidationResult + Verify-finalize chain | Derived + persisted business state |
| F14 Status | Presentation/UI state | UI State |
| F15 Plan Load | PackingPlan persistence | Persisted State |
| F16 Plan Save | PackingPlan persistence | Persisted State |
| F17 Microflow | Mendix integration boundary | External Contract |
| F18 Undo/Redo | CanvasState history | Working State |
| F19 Grid | Presentation | UI State |
| F20 Cargo Visual | CargoItem + UI state | Derived/UI |
| F21 Remove Cargo | CanvasState | Working State |
| F22 Loading Lifecycle | Loading/UI state | UI State |
| F23 Serialization | PackingPlanData | Persistence DTO |
| F24 Association Resolution | Mendix Infrastructure | External Contract |
| F25 Test Enforcement | Test infrastructure | Verification |

---

# 20. Forbidden Ownership Patterns

The following patterns are prohibited unless explicitly documented as an
architecture decision.

### Duplicate business state

```text
TruckSelection.CompleteLoading
        +
CanvasState.completeLoading
```

### Duplicate persistence state

```text
PackingPlan in React
        +
PackingPlan in Mendix
```

### Presentation-owned business data

```text
React component
    ↓
MxObject.set(...)
```

### Domain-owned persistence

```text
Domain rule
    ↓
mx.data.commit(...)
```

### Index-based identity

```text
cargo[3]
PackingPlanItem[3]
```

instead of stable GUID identity.

---

# 21. Change Impact and Data Ownership

Any change affecting a data owner must be evaluated as a potential
Change Impact increase.

Examples:

| Change | Expected impact |
|---|---|
| Change CanvasState field | State + interaction + tests |
| Change CargoItem identity | Cargo loading + placement + persistence |
| Change PackingPlan schema | Persistence + serialization + load/save |
| Change TruckSelection association | Infrastructure + loading + persistence |
| Change CompleteLoading lifecycle | Verify + save + Mendix business state |
| Change coordinate representation | Rendering + placement + persistence |
| Change TransportOrder identity mapping | Cargo + load/save + regression tests |

`FEATURE_MAP.md` owns the feature-level Change Impact classification.

`DATA_OWNERSHIP.md` provides the data-ownership evidence used to
calculate that impact.

---

# 22. AI / Cline Data Ownership Gate

Before changing code, Cline must answer:

1. What data is being changed?
2. Who currently owns that data?
3. Is it Source of Truth, Derived State, Working State, Persisted State,
   or UI State?
4. Is the requested change modifying ownership or only consuming data?
5. Does another feature depend on the same owner?
6. Does persistence behavior change?
7. Does the Mendix contract change?
8. Does `CompleteLoading` lifecycle change?
9. Does the change introduce a second source of truth?
10. What Change Impact level and CIS evidence result from the change?

### Ownership decision

```text
Existing owner
     │
     ├── Request only consumes it
     │       → keep ownership unchanged
     │
     ├── Request extends its behavior
     │       → evaluate EXTEND
     │
     ├── Request requires new independent data
     │       → evaluate NEW owner
     │
     └── Request creates duplicate owner
             → reject / redesign
```

---

# 23. New Data Ownership Checklist

Before introducing a new mutable data object:

- [ ] Define its owner.
- [ ] Define its category.
- [ ] Define its source of truth.
- [ ] Define its lifecycle.
- [ ] Define who may mutate it.
- [ ] Define who may read it.
- [ ] Define whether it is persisted.
- [ ] Define its stable identity.
- [ ] Define whether it is derived or authoritative.
- [ ] Check for an existing owner that can be reused.
- [ ] Update `FEATURE_MAP.md` if feature ownership/dependencies change.
- [ ] Update `BUSINESS_RULES.md` if business behavior changes.
- [ ] Update `docs/MENDIX_ENTITY.md` if the Mendix contract changes.
- [ ] Update `DOC_MAP.md` when documentation ownership changes.

---

# 24. SSOT Change Control

When ownership changes, update this document first.

Examples:

- a working-state field becomes persisted;
- a Mendix attribute becomes the authoritative value;
- a new persistence entity is introduced;
- `CompleteLoading` ownership changes;
- a derived value becomes business data;
- two existing owners are consolidated.

Do not silently change ownership through implementation code.

The documentation and implementation must converge on the same ownership
model.

---

# 25. Final Ownership Principle

```text
One business datum
        ↓
One authoritative owner
        ↓
Explicit transformations
        ↓
Explicit working state
        ↓
Explicit persistence
        ↓
Explicit business-state finalization
```

The widget should optimize for:

- one source of truth;
- explicit data flow;
- isolated persistence;
- stable identity;
- minimal duplicated state;
- predictable lifecycle;
- low Change Impact when features evolve.
