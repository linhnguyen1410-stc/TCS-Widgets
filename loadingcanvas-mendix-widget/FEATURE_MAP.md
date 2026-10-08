# Feature Map --- LoadingCanvas Widget

> **Purpose:** map each product feature to its business rules, domain
> capabilities, state ownership, infrastructure boundaries, presentation
> entry points, persistence dependencies, tests, and expected Change
> Impact.
>
> This document is the **feature-level architectural map**. It
> complements:
>
> -   `BUSINESS_RULES.md` --- what the system must enforce.
> -   `ARCHITECTURE.md` --- how the system is layered.
> -   `docs/MENDIX_ENTITY.md` --- how Mendix persistence and
>     associations work.
> -   `docs/DOC_MAP.md` --- which document owns each fact and which
>     changes require documentation updates.
> -   `README.md` --- user-facing capability overview.
>
> **Rule:** do not duplicate detailed business rules here. Reference
> `BR-*` identifiers instead.

------------------------------------------------------------------------

## 1. Feature Map Goals

`FEATURE_MAP.md` exists to answer five questions before changing code:

1.  **Where does this feature live?**
2.  **Which other features does it depend on?**
3.  **Which shared components could make the change affect unrelated
    features?**
4.  **What is the expected change impact?**
5.  **How can the feature be changed while preserving isolation and
    reuse?**

The target architecture is:

``` text
                         ┌───────────────────────┐
                         │      Presentation     │
                         │ components / hooks    │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │         State         │
                         │ controller / actions  │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │        Domain         │
                         │ rules / engines /     │
                         │ packing               │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │    Core / Shared      │
                         │ types / geometry /    │
                         │ constants / utilities │
                         └───────────────────────┘

                         ┌───────────────────────┐
                         │    Infrastructure     │
                         │ Mendix / adapters /   │
                         │ persistence           │
                         └───────────────────────┘
```

Infrastructure may consume Domain/Core contracts, while Presentation
must not bypass the architectural boundaries to call Mendix directly.

------------------------------------------------------------------------

# 2. Feature Inventory

  -----------------------------------------------------------------------------------------------------------
  ID         Feature         Primary Responsibility Business Rules   Main Layers       Isolation   Change Impact
  ---------- --------------- ---------------------- ---------------- ----------------- ----------- ----------
  F01        Truck loading   Resolve selected truck BR-01--BR-05     Infrastructure,   High        Medium
             context         and usable loading                      Domain, Core,                 
                             area                                    Presentation                  

  F02        Truck rendering Convert truck          BR-02--BR-04     Core,             High        Medium
             / scaling       dimensions from meters                  Infrastructure,               
                             to pixels                               Presentation                  

  F03        Cargo loading   Resolve                BR-06--BR-10     Infrastructure,   Medium      High
                             TransportOrders →                       Core,                         
                             PackingUnits →                          Presentation                  
                             PackingTypes                                                          

  F04        Cargo list      Display                BR-10, BR-10a,   Presentation,     High        Medium
                             available/unplaced     BR-30            State                         
                             cargo                                                                 

  F05        Canvas          Add and place cargo on BR-11, BR-30,    Domain, State,    High        Medium
             placement       canvas                 BR-30b, BR-30c,  Presentation                  
                                                    BR-46                                          

  F06        Drag            Move cargo using       BR-21,           Domain, State,    Medium      High
             interaction     pointer gestures       BR-28--BR-30b,   Presentation                  
                                                    BR-46                                          

  F07        Group selection Select and move        BR-28--BR-29     State, Domain,    Medium      Medium
             / drag          multiple cargo items                    Presentation                  

  F08        Rotation        Rotate cargo in 90°    BR-13--BR-16     Domain, State,    High        Medium
                             increments                              Presentation                  

  F09        Grid snapping   Align cargo to         BR-19--BR-20     Domain,           High        Low
                             grid/walls/neighbors                    Presentation                  

  F10        Collision       Detect/resolve overlap BR-11--BR-12,    Domain, State     High        High
             handling        and invalid placement  BR-21--BR-22,                                  
                                                    BR-46                                          

  F11        Load-meter      Calculate LM and       BR-17--BR-18     Domain            Very High   Medium
             validation      detect capacity                                                       
                             violation                                                             

  F12        Auto Load       Automatically pack all BR-23--BR-27     Domain, State,    High        High
                             cargo                                   Presentation                  

  F13        Manual Verify   Validate completeness  BR-40--BR-41,    Domain, State,    Very High   Medium
                                         BR-45, BR-47
                             and geometric          BR-45            Presentation                  
                             correctness                                                           

  F14        Status / error  Present selection,     BR-42--BR-44     State,            High        Medium
             display         drag, invalid,                          Presentation                  
                             loading, save and                                                     
                             packing states                                                        

  F15        Packing plan    Restore saved          BR-32,           Infrastructure,   High        High
             load            arrangement            BR-34--BR-38     State,                        
                                                                     Presentation                  

  F16        Packing plan    Replace persisted      BR-32--BR-36,    Infrastructure,   High        High
             save            arrangement            BR-39            State,                        
                                                                     Presentation                  

  F17        Save/load       Integrate optional     BR-39            Infrastructure,   High        Medium
             microflow       Mendix actions                          Presentation                  
             callbacks                                                                             

  F18        Undo/redo       Restore committed      README           State,            High        Medium
                             state transitions      capability;      Presentation                  
                                                    state                                          
                                                    architecture                                   

  F19        Canvas/grid     Render non-business    BR-44            Presentation      Very High   Low
             visual layer    visual guidance                                                       

  F20        Cargo visual    Render cargo type and  BR-08, BR-42     Presentation      High        Low
             state           interaction state                                                     

  F21        Remove cargo    Move cargo from canvas BR-10, BR-10a,   State, Domain,    High        Medium
                             back to available list BR-30a           Presentation                  

  F22        Loading         Prevent editing until  BR-31            Infrastructure,   High        Medium
             lifecycle       initial data is ready                   State,                        
                                                                     Presentation                  

  F23        Data            Convert pixels ↔       BR-34--BR-36     Core,             Very High   High
             serialization   meters for persistence                  Infrastructure                

  F24        Association     Resolve Mendix object  MENDIX_ENTITY    Infrastructure    Very High   High
             resolution      relationships                                                         

  F25        Test / contract Detect regressions     DOC_MAP / test   All               Very High   High
             enforcement     across layers and      strategy                                       
                             features                                                              
  -----------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 3. Feature Dependency Graph

``` text
F01 Truck Context
 │
 ├──────────────► F02 Truck Rendering
 │                    │
 │                    └──────────────► F05 Canvas Placement
 │
 └──────────────► F03 Cargo Loading
                      │
                      └──────────────► F04 Cargo List
                                           │
                                           ▼
                                      F05 Placement
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
                 F06 Drag              F08 Rotation           F09 Snap
                    │                      │                      │
                    └──────────────┬───────┴──────────────┬───────┘
                                   ▼                      ▼
                              F10 Collision          F11 LM Validation
                                   │                      │
                                   └──────────┬───────────┘
                                              ▼
                                         F13 Verify
                                              │
                                              ▼
                                         F14 Status

F03 Cargo Loading ───────────────────────────► F12 Auto Load
F01 Truck Context ───────────────────────────► F12 Auto Load
F12 Auto Load ───────────────────────────────► F13 Verify

F05–F14 ─────────────────────────────────────► F15 Plan Load
F05–F14 ─────────────────────────────────────► F16 Plan Save

F15 Plan Load ───────────────► F22 Loading Lifecycle
F16 Plan Save ───────────────► F17 Microflow Callback

F05–F16 ─────────────────────► F18 Undo/Redo

F02 + F03 + F23 + F24 ───────► Persistence correctness
```

------------------------------------------------------------------------

# 4. Feature-to-Layer Map

  Feature                   Core   Domain   State   Infrastructure   Presentation
  ------------------------ ------ -------- ------- ---------------- --------------
  Truck context              ●       ●        ●           ●               ●
  Truck rendering            ●                            ●               ●
  Cargo loading              ●                ●           ●               ●
  Cargo list                                  ●                           ●
  Placement                  ●       ●        ●                           ●
  Drag                       ●       ●        ●                           ●
  Group drag                 ●       ●        ●                           ●
  Rotation                   ●       ●        ●                           ●
  Snap                       ●       ●                                    ●
  Collision                  ●       ●        ●                     
  Load meter                 ●       ●                              
  Auto Load                  ●       ●        ●                           ●
  Verify                     ●       ●        ●                           ●
  Status                                      ●                           ●
  Plan load                  ●                ●           ●               ●
  Plan save                  ●                ●           ●               ●
  Microflow                                               ●               ●
  Undo/redo                  ●       ●        ●                           ●
  Grid overlay               ●                                            ●
  Cargo visual state         ●                ●                           ●
  Remove cargo               ●       ●        ●                           ●
  Loading lifecycle                           ●           ●               ●
  Serialization              ●       ●                    ●         
  Association resolution                                  ●         

### Layer interpretation

-   **Core:** reusable, framework-independent primitives.
-   **Domain:** business behavior and rules.
-   **State:** interaction orchestration and single source of truth.
-   **Infrastructure:** Mendix runtime, adapters, persistence and
    external data.
-   **Presentation:** React components, hooks and widget composition.

------------------------------------------------------------------------

# 5. Feature Ownership Map

The following is the preferred ownership model.

## F01 --- Truck Loading Context

**Purpose:** establish the truck being planned and its usable
dimensions.

**Source chain:**

``` text
TruckSelection
   ↓
ResourceInstance
   ↓
Resource
   ↓
TechnicalDetails
   ↓
Truck view model
```

**Primary implementation:**

-   `src/infrastructure/adapters/truckLoader.ts`
-   `src/infrastructure/adapters/truckAdapter.ts`
-   `src/core/types/Truck.ts`
-   `src/core/types/viewModels/TruckItem.ts`

**Rules:** BR-01--BR-05.

**Isolation rule:** changes to Mendix associations or raw attributes
must remain inside Infrastructure. Domain and Presentation should
consume the normalized truck model.

------------------------------------------------------------------------

## F02 --- Truck Rendering / Scale

**Purpose:** convert physical truck dimensions to the visual frame.

**Primary implementation:**

-   `src/infrastructure/adapters/truckAdapter.ts`
-   `src/core/constants/canvas.ts`
-   `src/core/utils/coordinates.ts`
-   Presentation canvas rendering.

**Critical invariant:**

``` text
meters
  ↓
one uniform truck-specific scale
  ↓
pixels
```

Truck dimensions must not be independently scaled for length and width.

**Risk:** changing scale constants can affect every cargo-placement and
persistence calculation.

**Change impact:** Medium.

------------------------------------------------------------------------

## F03 --- Cargo Loading

**Purpose:** load cargo from the selected TransportOrders.

**Source chain:**

``` text
TruckSelection
   ↓
TransportOrderSequence
   ↓
TransportOrder
   ↓
PackingUnit
   ↓
PackingType
   ↓
CargoItem
```

**Primary implementation:**

-   `src/infrastructure/adapters/cargoLoader.ts`
-   `src/infrastructure/adapters/cargoAdapter.ts`
-   `src/infrastructure/mendix/mendixLoaders.ts`
-   `src/infrastructure/mendix/mendixAssociations.ts`
-   `src/core/types/viewModels/CargoItem.ts`

**Important invariant:** cargo identity is keyed by the TransportOrder
GUID, not array position.

**Change impact:** High because cargo loading feeds the list, canvas,
Auto Load, Verify and persistence.

------------------------------------------------------------------------

# 6. Interaction Feature Cluster

The interaction cluster should share infrastructure without sharing
feature-specific behavior unnecessarily.

``` text
                    ┌──────────────┐
                    │ Canvas Input │
                    └──────┬───────┘
                           ▼
                    ┌──────────────┐
                    │ State Action │
                    └──────┬───────┘
                           ▼
              ┌────────────┴────────────┐
              ▼                         ▼
        Drag / Move                 Rotation
              │                         │
              └────────────┬────────────┘
                           ▼
                     Domain Rules
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
           Snap        Collision        LM
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                         State
                           │
                           ▼
                           UI
```

## Isolation rule

A feature should reuse:

-   geometry primitives,
-   state contracts,
-   coordinate conversion,
-   common validation results,
-   common cargo/truck view models.

A feature should **not** reuse another feature's orchestration code
merely because the code happens to be convenient.

### Good reuse

``` text
Rotation
 └── uses Geometry / Coordinate / Validation primitives

Drag
 └── uses Geometry / Coordinate / Snap primitives
```

### Bad reuse

``` text
Verify
 └── calls AutoLoad internals to validate placement
```

Verify and Auto Load may share pure domain predicates, but their
orchestration must remain independent.

------------------------------------------------------------------------

# 7. F05--F10 Placement / Interaction Boundary

## F05 --- Canvas Placement

Placement is the common entry point for cargo entering the canvas.

It must support:

-   drag from cargo list,
-   click-to-add,
-   restored saved items,
-   Auto Load results.

It should not contain:

-   Mendix API calls,
-   React-specific pointer handling,
-   persistence logic.

------------------------------------------------------------------------

## F06 --- Drag

**Domain responsibilities:**

-   calculate candidate position,
-   apply movement constraints,
-   invoke snap behavior,
-   preserve item geometry.

**Presentation responsibilities:**

-   pointer/touch/pen events,
-   visual drag state,
-   event lifecycle.

**State responsibilities:**

-   commit the final gesture as one logical transition,
-   notify dependent UI.

------------------------------------------------------------------------

## F07 --- Group Selection / Drag

Group interaction is a state concern layered over the same geometry/drag
primitives.

Do not create a second geometry engine for group drag.

``` text
Single item drag
      │
      ├── selection = one item
      │
      └── same drag engine

Group drag
      │
      ├── selection = many items
      │
      └── same drag engine + group transform
```

------------------------------------------------------------------------

## F08 --- Rotation

Rotation owns:

-   90° increments,
-   orientation,
-   footprint transformation,
-   locked-item behavior.

Rules: BR-13--BR-16.

Rotation must reuse the same geometry representation used by Drag,
Collision and Verify.

------------------------------------------------------------------------

## F09 --- Snap

Snap is a reusable positioning service/rule.

Priority:

``` text
Truck wall
    ↓
Neighbor edge touching
    ↓
Neighbor edge alignment
    ↓
Grid
```

Snap must remain independent from React and Mendix.

------------------------------------------------------------------------

## F10 --- Collision

Collision is a domain capability.

It must remain independent from:

-   UI rendering,
-   pointer events,
-   Mendix APIs,
-   persistence.

The current business contract deliberately distinguishes:

``` text
Manual placement
    → free placement
    → overlap may temporarily exist

Verify
    → strict validation

Auto Load
    → strict packing
```

Therefore, collision detection and collision prevention are not the same
feature.

------------------------------------------------------------------------

# 8. Validation Feature Cluster

## F11 --- Load Meter

**Single source of truth:** Domain.

Rules:

-   BR-17
-   BR-18

The UI may display `LM_EXCEEDED`, but must not independently calculate
the business result.

``` text
Cargo geometry
      +
Truck loading frame
      ↓
Domain LM calculation
      ↓
ValidationResult
      ↓
State
      ↓
Presentation
```

------------------------------------------------------------------------

## F13 --- Verify

Verify is a **gate**, not a continuous replacement for manual
interaction.

It must check:

1.  all required cargo is placed,
2.  no overlap,
3.  all cargo is inside truck bounds,
4.  load meters are valid.

The verification result becomes invalid when the canvas item count
changes.

This prevents stale verification state.

------------------------------------------------------------------------

# 9. Auto Load

## F12 --- Auto Load

Auto Load is a distinct domain feature.

Rules:

-   BR-23
-   BR-24
-   BR-25
-   BR-26
-   BR-27

### Optimization priority

``` text
1. Maximize number of loaded units
2. Minimize used load meters
3. Minimize used width
4. Minimize number of 90° turns
```

### Algorithm boundary

``` text
AutoLoad Orchestrator
       │
       ├── packingRules
       ├── packingOptimizer
       ├── geometry
       └── validation
```

The optimizer must not know about:

-   React,
-   Mendix,
-   MxObject,
-   DOM,
-   UI components.

### Important isolation rule

Auto Load may reuse:

-   geometry,
-   placement validity,
-   rotation,
-   dimensions,
-   LM calculation.

It should not reuse:

-   UI drag handlers,
-   canvas event handlers,
-   persistence adapters.

------------------------------------------------------------------------

# 10. Packing Plan Persistence

Persistence is one of the highest-risk feature areas because it crosses
Domain/Core, State, Infrastructure and Mendix.

## F15 --- Load Plan

``` text
Mendix
  ↓
PackingPlan
  ↓
PackingPlanItem
  ↓
TransportOrder GUID
  ↓
PackingPlanData
  ↓
deserializePlan()
  ↓
CargoItem[]
  ↓
State
  ↓
Canvas
```

### Important rules

-   One plan per TruckSelection --- BR-32.
-   Load automatically on page open --- BR-37.
-   Missing plan must not destroy unsaved canvas work --- BR-38.
-   Obsolete TransportOrders are filtered from restored items.

------------------------------------------------------------------------

## F16 --- Save Plan

``` text
Canvas State
    ↓
serialize to meters
    ↓
PackingPlanData
    ↓
find PackingPlan
    ↓
delete old PackingPlanItems
    ↓
create new PackingPlanItems
    ↓
commit
    ↓
optional microflow
```

### Critical persistence invariants

-   Save is **replace**, not merge.
-   Coordinates are stored in meters.
-   Coordinates are relative to the truck interior origin.
-   Z is always zero.
-   Rotation is one of `0/90/180/270`.
-   TransportOrder association must be resolved by GUID.
-   Batch response ordering must never be used as identity.

------------------------------------------------------------------------

# 11. Persistence Boundary

The persistence boundary must remain explicit:

``` text
┌─────────────────────────────┐
│ Domain / State              │
│                             │
│ CargoItem                   │
│ PackingPlanData             │
└──────────────┬──────────────┘
               │ contract
               ▼
┌─────────────────────────────┐
│ Infrastructure              │
│                             │
│ planLoader                  │
│ planSaver                   │
│ planRepository              │
│ mendixMappers               │
│ mendixLoaders               │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Mendix Runtime              │
│ mx.data.get/create/remove   │
│ mx.data.commit/action       │
└─────────────────────────────┘
```

No presentation component should directly depend on `mx.data`.

------------------------------------------------------------------------

# 12. Mendix Entity Feature Boundary

## Existing entities consumed

``` text
TruckSelection
 ├── ResourceInstance
 │    └── Resource
 │         └── TechnicalDetails
 │
 └── TransportOrderSequence
      └── TransportOrder
           └── PackingUnit
                └── PackingType
```

## New persistence entities

``` text
PackingPlan
 ├── TruckSelection
 └── PackingPlanItem
       └── TransportOrder
```

### Design constraint

The widget adds the PackingPlan persistence model without modifying the
existing business model structure.

This is an important isolation boundary.

------------------------------------------------------------------------

# 13. State Ownership Map

`src/state/` is the interaction orchestration boundary.

  -----------------------------------------------------------------------
  State Concern                       Owner
  ----------------------------------- -----------------------------------
  Current canvas items                `CanvasState`

  Current selection                   `CanvasState`

  Active interaction                  `CanvasState` / controller

  Loading state                       State

  Validation result                   State

  Save status                         State

  Auto Load result                    State

  Undo/redo history                   State

  User actions                        `CanvasActionDispatcher`

  Interaction orchestration           `CanvasController` /
                                      `CanvasStateManager`
  -----------------------------------------------------------------------

### State rule

Components should render state and dispatch actions. They should not
independently maintain competing sources of truth for canvas behavior.

------------------------------------------------------------------------

# 14. Presentation Feature Map

  -----------------------------------------------------------------------
  UI Area                             Main Components
  ----------------------------------- -----------------------------------
  Widget composition                  `LoadingCanvas.container.tsx`,
                                      `LoadingCanvasView.tsx`

  Cargo list                          `CargoList.tsx`, `CargoCard.tsx`

  Canvas                              Widget view + canvas hooks

  Grid                                `GridOverlay.tsx`

  Rotation                            `RotationHandle.tsx`

  Toolbar                             `CanvasToolbar.tsx`

  Information                         `CargoPopup.tsx`,
                                      `CargoTooltip.tsx`

  Interaction                         `useCanvasActions.ts`,
                                      `useCanvasState.ts`,
                                      `useTruckCanvas.ts`
  -----------------------------------------------------------------------

Presentation should remain replaceable without changing Domain behavior.

------------------------------------------------------------------------

# 15. Feature Isolation Zones

The project should be treated as several isolation zones.

``` text
ZONE A — Shared Kernel
────────────────────────────────
geometry
types
constants
coordinates
IDs

Risk: VERY HIGH
Rule: changes require broad regression testing


ZONE B — Domain
────────────────────────────────
drag
collision
snap
rotation
validation
packing

Risk: HIGH
Rule: pure logic, strong unit/integration tests


ZONE C — State
────────────────────────────────
canvas state
actions
controller
undo/redo

Risk: HIGH
Rule: interaction contracts must remain stable


ZONE D — Infrastructure
────────────────────────────────
Mendix
loaders
adapters
repositories
serialization

Risk: HIGH
Rule: external changes must not leak upward


ZONE E — Presentation
────────────────────────────────
components
hooks
widget composition

Risk: LOW–MEDIUM when isolated
Rule: UI changes must not change business behavior
```

------------------------------------------------------------------------

# 16. Change Impact Classification

Change impact describes the expected scope of consequences when a feature, shared contract, state owner, persistence boundary, or business rule is changed.

It is an architectural assessment, not a measure of code quality.

### Change Impact levels

| Level | Meaning | Default action |
|---|---|---|
| `LOW` | Localized change with no shared contract or cross-feature effect | Review direct dependents and focused tests |
| `MEDIUM` | Change crosses a feature boundary or shared state/utility | Trace affected features and run targeted regression tests |
| `HIGH` | Change affects shared domain behavior, persistence, state, or multiple features | Perform explicit impact analysis before implementation |
| `CRITICAL` | Change affects core contracts, external contracts, or system-wide semantics | Architecture review and staged implementation required |

## Change Impact assessment

The assessment must consider evidence from:

- direct files changed,
- shared modules consumed,
- dependent features,
- state ownership,
- persistence impact,
- business-rule impact,
- external/Mendix contract impact,
- UI surface,
- required regression tests.

Do not classify impact from the number of changed lines alone.

### Change Impact Score (CIS)

When a non-trivial change is being planned, `CIS` may be used to make the assessment explicit.

| Factor | Range |
|---|---:|
| Direct files | 0–5 |
| Shared modules | 0–5 |
| Affected features | 0–10 |
| State impact | 0–5 |
| Persistence impact | 0–5 |
| Business-rule impact | 0–5 |
| External contract impact | 0–5 |
| UI surface | 0–3 |
| Test/regression surface | 0–2 |

**CIS = sum of the applicable factors.**

| CIS | Change Impact |
|---:|---|
| `0–10` | LOW |
| `11–25` | MEDIUM |
| `26–40` | HIGH |
| `41–45` | CRITICAL |

The score is an aid to consistent reasoning. If the evidence indicates a higher architectural risk than the numeric score suggests, use the higher level.

## Typical impact examples

### LOW

Typical changes:

- isolated UI text,
- tooltip,
- non-functional styling,
- component-local visual detail.

Expected verification:

- component test,
- visual check.

### MEDIUM

Typical changes:

- isolated Presentation component with shared state interaction,
- state action,
- rotation UI,
- cargo list behavior,
- widget composition.

Expected verification:

- affected unit tests,
- state tests,
- integration test,
- manual UI regression.

### HIGH

Typical changes:

- Domain engine,
- validation rule,
- packing algorithm,
- serialization,
- cargo/truck adapters,
- persistence behavior.

Expected verification:

- unit tests,
- integration tests,
- contract tests,
- regression suite,
- affected feature matrix.

### CRITICAL

Typical changes:

- Core geometry model,
- coordinate convention,
- CargoItem/TruckItem contract,
- Mendix association contract,
- meter/pixel conversion,
- state machine contract.

Expected verification:

```text
Unit tests
+
Contract tests
+
Integration tests
+
Regression tests
+
Persistence tests
+
Manual end-to-end verification
```

------------------------------------------------------------------------

# 17. Shared Code vs Feature Isolation

The project should follow the rule:

> **Reuse stable primitives, not unstable feature orchestration.**

## Good candidates for reuse

``` text
Point
Size
Rectangle
Rotation
GeometryItem
Coordinate conversion
Cargo identity
Truck view model
Validation result
PackingPlanData
```

## Dangerous candidates for reuse

``` text
useAutoLoad()
useVerify()
handleDragAndSave()
handleVerifyAndReload()
sharedMegaHook()
sharedFeatureController()
```

The second group tends to create hidden coupling and increases change impact.

------------------------------------------------------------------------

# 18. Reuse Decision Matrix

Before reusing code, evaluate:

  ------------------------------------------------------------------------
  Question                 Yes                     No
  ------------------------ ----------------------- -----------------------
  Is the behavior          Continue                Keep separate
  conceptually identical?                          

  Is the input/output      Continue                Keep separate
  contract stable?                                 

  Is it                    Prefer reuse            Consider isolation
  framework-independent?                           

  Can a change affect      Add contract tests      Lower risk
  multiple features?                               

  Does reuse require       Avoid                   Prefer reuse
  feature-specific flags?                          

  Does the shared function Avoid                   Continue
  know about UI state?                             

  Does it know about       Keep                    Continue
  Mendix?                  Infrastructure-only     

  Would changing feature A Reconsider boundary     Good reuse
  require testing feature                          
  B?                                               
  ------------------------------------------------------------------------

### Strong warning sign

``` text
if (feature === "A") {
    ...
} else if (feature === "B") {
    ...
}
```

inside a supposedly shared domain service is usually a signal that the
abstraction is too broad.

------------------------------------------------------------------------

# 19. Feature Change Protocol

Before modifying a feature:

``` text
1. Identify feature ID
        ↓
2. Read referenced BR-* rules
        ↓
3. Identify primary owner layer
        ↓
4. Identify dependencies
        ↓
5. Identify shared contracts
        ↓
6. Estimate change impact
        ↓
7. Identify required tests
        ↓
8. Implement inside feature boundary
        ↓
9. Run dependency/regression checks
        ↓
10. Update documentation/change history
```

------------------------------------------------------------------------

# 20. Feature Change Record

Every non-trivial feature change should be describable using:

``` text
Feature:
Fxx

Change:
<what changed>

Reason:
<why>

Business Rules:
BR-xx, BR-yy

Primary Owner:
<layer/file>

Dependencies:
<feature IDs>

Shared Contracts:
<types/functions/contracts>

Data Ownership:
<reference the owning data/state defined by DATA_OWNERSHIP.md>

Change Impact: LOW / MEDIUM / HIGH / CRITICAL
CIS:
<score and evidence>

Affected Features:
<Fxx, Fyy>

Regression Tests:
<tests>

Documentation:
<BUSINESS_RULES / ARCHITECTURE / MENDIX_ENTITY / CHANGELOG>

Isolation Assessment:
<why unrelated features remain unaffected>
```

------------------------------------------------------------------------

# 21. Feature Dependency Matrix

Legend:

-   `P` = primary dependency
-   `S` = shared dependency
-   `I` = integration dependency
-   `—` = independent

  -----------------------------------------------------------------------------------------
  Feature     F01   F02   F03   F05   F06   F08   F09   F10   F11   F12   F13   F15   F16
  ----------- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- -----
  F01 Truck   ---   P     P     P     S     S     S     P     P     P     P     P     P

  F02         S     ---   S     P     S     S     S     S     S     S     S     S     S
  Rendering                                                                           

  F03 Cargo   P     S     ---   P     P     P     S     P     S     P     P     P     P

  F05         P     P     P     ---   P     P     P     P     P     P     P     S     S
  Placement                                                                           

  F06 Drag    S     S     P     P     ---   S     P     P     S     S     S     S     S

  F08         S     S     P     P     S     ---   S     P     P     P     P     S     S
  Rotation                                                                            

  F09 Snap    S     S     S     P     P     S     ---   S     S     P     P     S     S

  F10         P     S     P     P     P     P     S     ---   P     P     P     S     S
  Collision                                                                           

  F11 LM      P     S     P     P     S     P     S     P     ---   P     P     P     P

  F12 Auto    P     P     P     P     S     P     P     P     P     ---   P     S     S
  Load                                                                                

  F13 Verify  P     S     P     P     S     P     S     P     P     S     ---   S     S

  F15 Load    P     S     P     P     S     S     S     S     S     S     S     ---   P
  Plan                                                                                

  F16 Save    P     S     P     P     S     S     S     S     S     S     S     P     ---
  Plan                                                                                
  -----------------------------------------------------------------------------------------

### Interpretation

The highest coupling is intentionally concentrated around:

-   Core geometry,
-   Cargo/Truck models,
-   State,
-   Persistence contracts.

These are architectural choke points and therefore require stronger
regression protection.

------------------------------------------------------------------------

# 22. Architectural Choke Points

The following components deserve special protection because many
features depend on them.

  -------------------------------------------------------------------------
  Choke Point               Why Important           Protection
  ------------------------- ----------------------- -----------------------
  `geometry.ts`             Shared geometry         Contract tests
                            contract                

  `coordinates.ts`          Meter/pixel conversion  Round-trip tests

  `CargoItem`               Main cargo              Type + integration
                            representation          tests

  `TruckItem`               Main truck              Fleet regression suite
                            representation          

  `CanvasState`             Single source of truth  State tests

  `CanvasStateManager`      Interaction             State/integration tests
                            orchestration           

  `validationRules.ts`      Verify contract         Domain tests

  `packingRules.ts`         Auto Load contract      Packing integration
                                                    tests

  `packingOptimizer.ts`     Optimization behavior   Deterministic test
                                                    suite

  `mendixMappers.ts`        Persistence boundary    Contract tests

  `mendixAssociations.ts`   Runtime relationship    Mendix integration
                            resolution              tests

  `planLoader.ts`           Restore behavior        Persistence tests

  `planSaver.ts`            Save replacement        Persistence tests
                            behavior                
  -------------------------------------------------------------------------

------------------------------------------------------------------------

# 23. Safe Change Zones

When implementing a new feature, prefer this order:

``` text
NEW FEATURE
    │
    ├── 1. New feature-specific domain rule
    │       ↓
    ├── 2. New feature-specific state action
    │       ↓
    ├── 3. New feature-specific presentation
    │
    └── Only then consider shared extraction
```

Avoid starting with:

``` text
"Let's modify the existing shared utility so the new feature can use it."
```

unless the existing utility is genuinely missing a generic capability.

This minimizes accidental changes to existing features.

------------------------------------------------------------------------

# 24. New Feature Template

Every new feature should initially be mapped as:

``` text
Fxx — <Feature Name>

Purpose:
<one sentence>

Business Rules:
BR-xx

Primary Owner:
<Domain / State / Infrastructure / Presentation>

Inputs:
<contracts>

Outputs:
<contracts>

Dependencies:
<Fxx...>

Reused Primitives:
<core/domain primitives>

Data Ownership:
<source of truth / working state / derived state / persisted state>

Persistence:
<none / PackingPlan / Mendix entity>

UI:
<components/hooks>

Change Impact: <LOW / MEDIUM / HIGH / CRITICAL> (CIS: <score>)

Regression Requirements:
<tests>

Isolation Strategy:
<how existing features remain unchanged>
```

------------------------------------------------------------------------

# 25. Documentation Ownership

`FEATURE_MAP.md` does not replace the other documents.

  Information                               Owner
  ----------------------------------------- -------------------------
  What the system must do                   `BUSINESS_RULES.md`
  How the system is structured              `ARCHITECTURE.md`
  What Mendix entities/associations exist   `docs/MENDIX_ENTITY.md`
  Which document owns a fact                `docs/DOC_MAP.md`
  What features exist and how they depend   `FEATURE_MAP.md`
  What changed and why                      `CHANGELOG.md`
  Known defects                             `BUGLOG.md`
  Technical debt                            `DEBT.md`
  Architectural decisions                   `docs/adr/`

------------------------------------------------------------------------

# 26. AI / Cline Feature Safety Contract

Cline or another coding agent should use this file before modifying an
existing feature.

## Required analysis

Before editing:

``` text
Feature identification
        ↓
Feature dependencies
        ↓
Business rule references
        ↓
Primary ownership layer
        ↓
Shared contracts
        ↓
Change impact
        ↓
Affected tests
```

The agent should explicitly answer:

1.  Which `Fxx` feature is being changed?
2.  Which `BR-*` rules are involved?
3.  Which files are feature-local?
4.  Which files are shared?
5.  Which other `Fxx` features depend on the changed shared code?
6.  Is a shared abstraction actually required?
7.  Which data/state owner is affected?
8.  What is the estimated Change Impact and CIS evidence?
9.  Which regression tests prove unaffected features remain correct?

------------------------------------------------------------------------

# 27. AI Change Guardrails

### Rule A --- Do not widen a feature unnecessarily

If a feature can be implemented inside its own boundary, do not modify
shared infrastructure.

### Rule B --- Shared code requires evidence

Promote code into Core/shared infrastructure only when:

-   at least two features need the same semantics, or
-   the abstraction is a clearly stable primitive.

### Rule C --- Business behavior belongs in Domain

Do not put business rules into React components, hooks or Mendix
adapters.

### Rule D --- Mendix knowledge stays at the boundary

Mendix entity names, associations and `mx.data` calls belong in
Infrastructure.

### Rule E --- UI changes must preserve behavior

A presentation change must not alter:

-   geometry,
-   validation,
-   persistence,
-   packing behavior,
-   state semantics.

### Rule F --- Core changes are high-risk

Any change to Core must trigger a dependency-based regression
assessment.

### Rule G --- Do not create feature flags inside generic functions without justification

Feature-specific branches inside shared code increase coupling and
reduce isolation.

------------------------------------------------------------------------

# 28. Current Architectural Assessment

Based on the current documented architecture:

### Strong isolation

-   Domain rules are framework-independent.
-   Mendix access is concentrated in Infrastructure.
-   Presentation is separated from persistence.
-   Packing is separated from UI interaction.
-   Business rules have stable `BR-*` identifiers.
-   Entity design is separately documented.
-   Documentation ownership and trigger rules are defined.

### Main coupling risks

1.  **Core geometry / coordinate contracts**
    -   Used by almost every spatial feature.
    -   Highest regression sensitivity.
2.  **CargoItem / TruckItem view models**
    -   Cross-layer contracts.
    -   Changes can affect loading, rendering, placement and
        persistence.
3.  **Canvas state**
    -   Central interaction source of truth.
    -   Changes can affect nearly every UI behavior.
4.  **Mendix association resolution**
    -   A small runtime naming change can break loading/saving.
5.  **Serialization**
    -   Meter/pixel conversion crosses the UI/domain/persistence
        boundary.
6.  **Auto Load**
    -   Uses many domain primitives and can therefore expose regressions
        in geometry, rotation, bounds and LM calculations.

### Recommended architectural priority

``` text
Highest protection
    │
    ├── Core contracts
    ├── Domain geometry / validation
    ├── State contracts
    ├── Persistence contracts
    │
    ├── Infrastructure adapters
    │
    └── Presentation components
       Lowest inherent change impact
```

------------------------------------------------------------------------

# 29. Definition of Feature Isolation

A feature is considered **isolated** when:

``` text
Feature A changes
      │
      ├── its own business rules remain local
      ├── its state transitions remain local
      ├── its UI remains local
      ├── its persistence changes remain local
      │
      └── shared primitives remain semantically unchanged
                 │
                 ▼
          Feature B behavior unchanged
```

Isolation does **not** mean zero code reuse.

The desired architecture is:

> **High reuse of stable primitives + low reuse of feature
> orchestration.**

This is the central balance between maintainability, reuseability and
change-impact control.

------------------------------------------------------------------------

# 30. Final Feature Architecture

``` text
                         LoadingCanvas
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼
     Truck Context        Cargo Context        Plan Context
          │                   │                    │
          ▼                   ▼                    ▼
     Truck Render         Cargo List         Load / Save
          │                   │                    │
          └──────────────┬────┴────────────────────┘
                         ▼
                  Canvas Interaction
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
        Drag          Rotate           Snap
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                    Geometry
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
          Collision      LM       Validation
              │          │          │
              └──────────┼──────────┘
                         ▼
                    Auto Load
                         │
                         ▼
                      Verify
                         │
                         ▼
                       State
                         │
                         ▼
                    Presentation
```

**Architectural target:**

``` text
Feature isolation        ████████████████████  high
Stable code reuse        ████████████████████  high
Shared mutable behavior  ████                  low
UI → business coupling   ██                    very low
UI → Mendix coupling     ██                    very low
Domain → framework       ██                    very low
Change impact             controlled
```

------------------------------------------------------------------------

## 31. Maintenance Rule

When a new feature is added:

> **Do not ask only "where should I put the code?"**

Ask:

> **"What is the smallest feature boundary that can implement this
> behavior, what stable primitives can it reuse, and what existing
> features could be affected if those primitives change?"**

That question is the primary purpose of `FEATURE_MAP.md`.


## 32. SSOT Change Control

### When FEATURE_MAP.md MUST be updated

Update this document in the same change whenever any of the following changes:

- A feature is added, removed, renamed, split, merged, or materially redefined.
- A feature's owner layer changes.
- A feature gains or loses a dependency.
- A shared module becomes feature-specific, or vice versa.
- A feature crosses an isolation boundary.
- The estimated change impact changes.
- A new architectural choke point is introduced.
- A change materially alters the expected affected-feature set.

### Definition of Done

A feature change is not architecturally complete until:

- implementation is complete;
- affected tests are updated;
- relevant business/architecture/data documentation is updated;
- `FEATURE_MAP.md` reflects the final dependency and impact state;
- no stale feature dependency or impact information remains.

### AI/Cline requirement

Before modifying code for a non-trivial feature change, AI must read:

1. `FEATURE_MAP.md`
2. the relevant domain/business rules
3. the relevant architecture section
4. `DATA_OWNERSHIP.md`, when present
5. the relevant Mendix entity documentation
6. the relevant testing guidance

AI must identify the feature ID, owner, dependencies, isolation boundary, and Change Impact/CIS level before editing code.

After implementation, AI must re-evaluate the same items and update this document if the actual change differs from the pre-change assessment.
