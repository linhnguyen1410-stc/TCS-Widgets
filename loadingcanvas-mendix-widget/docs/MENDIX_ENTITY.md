# PackingPlan Entity Design — TCSLoadingMeter Module

## Overview

This document describes the new `PackingPlan` and `PackingPlanItem` entities to be
created in the **TCSLoadingMeter** module in Mendix Studio Pro. These entities
store the saved packing arrangement for each truck (TruckSelection).

## Design Constraints

See [BUSINESS_RULES.md](../BUSINESS_RULES.md) for the business rules that govern packing plans (BR-32 through BR-39).

- **Only 1 packing plan per truck** (no versioning) — see BR-32
- **Save = delete + recreate items** (simplest approach) — see BR-33
- **Load on page open** — when the widget loads, it reads the saved plan — see BR-37
- **Do NOT modify existing Mendix model structure** — only add new entities

<!-- DOCS_SYNC:packingplan-attributes:START -->
| Attribute | Mendix Name |
|-----------|-------------|
| createdDate | CreatedDate |
| modifiedDate | ModifiedDate |
<!-- DOCS_SYNC:packingplan-attributes:END -->

**Note:** Mendix automatically creates a hidden `id` attribute for every entity. This serves as the primary key and is used internally for object identification and relationships. No manual ID attribute is needed.

**Relationships:**

- `PackingPlan` → `PackingPlanItem` (1-to-many, cascade delete)

## Entity: PackingPlanItem

<!-- DOCS_SYNC:packingplanitem-attributes:START -->
| Attribute | Mendix Name |
|-----------|-------------|
| positionX | PositionX |
| positionY | PositionY |
| length | Length |
| width | Width |
| height | Height |
| rotation | Rotation |
| color | Color |
| lengthMeters | LengthMeters |
| widthMeters | WidthMeters |
| weightKg | WeightKg |
<!-- DOCS_SYNC:packingplanitem-attributes:END -->

**Note:** Mendix automatically creates a hidden `id` attribute for every entity. This serves as the primary key and is used internally for object identification and relationships. No manual ID attribute is needed.

## Data Model Diagram

```
TCSLoadingMeter Module (NEW entities):

  PackingPlan
  ├─ id (auto-generated PK, hidden)
  ├─ TruckSelection → TCSTransportModule.TruckSelection (1-1)
  ├─ CreatedDate
  ├─ ModifiedDate
  └─ PackingPlanItem (1-*)

  PackingPlanItem
  ├─ id (auto-generated PK, hidden)
  ├─ PackingPlan → TCSLoadingMeter.PackingPlan (*-1)
  ├─ TransportOrder → TCSTransportModule.TransportOrder (*-1)
  ├─ PositionX (Decimal, meters)
  ├─ PositionY (Decimal, meters)
  ├─ Length (Decimal, meters)
  ├─ Width (Decimal, meters)
  ├─ Height (Decimal, meters)
  ├─ Rotation (Integer: 0/90/180/270)
  ├─ Color (String)
  ├─ LengthMeters (Decimal, optional)
  ├─ WidthMeters (Decimal, optional)
  └─ WeightKg (Decimal, optional)
```

## Integration with Existing Data Model

The new entities integrate with the existing model via references.

> **Runtime association names.** The MxObject `get()`/`set()` name is `OwningModule.AssociationName`
> (e.g. `TCSTransportModule.TransportOrder_Product`), verified against the database join tables
> (`tcstransportmodule$transportorder_packingunit`, `tcstransportmodule$transportorder_product`,
> `datamodelmodule$packingunit_packingtype`, `tcstransportmodule$transportorder_company_from`,
> `tcstransportmodule$transportorder_company_to`, `tcstransportmodule$transportorder_producer`).
> Descriptive spellings that embed the target module
> (e.g. `TransportOrder_DataModelModule.Product`) never resolve at runtime; the adapter keeps them
> only as bounded fallbacks. Reference sets (1-\*) return a GUID array from `get()`; single
> references return one GUID.

```
TCSLoadingMeter.TruckSelection_TCSTransportModule.Session (1-*)
TruckSelection_ResourceInstance (1-*)
TCSTransportModule.ResourceInstance_Resource (1-*)
DataModelModule.Resource_TechnicalDetails (1-1)
TCSTransportModule.TransportOrderSequence_TruckSelection (*-1)
TransportOrderSequence_TransportOrder (1-*)
TCSTransportModule.TransportOrder_PackingUnit (1-*)
TCSTransportModule.TransportOrder_Product (1-*)
TCSTransportModule.TransportOrder_Company_From (1-*)
TCSTransportModule.TransportOrder_Company_To (1-*)
TCSTransportModule.TransportOrder_Producer (1-*)
DataModelModule.PackingUnit_PackingType (1-*)

List off entity with attributes:

TruckSelection:
- TruckIndex (integer)
- CompleteLoading (Boolean) — written by the Verify-finalize chain (BR-47): set to true
  via `markTruckSelectionCompleteLoading` only after the packing plan is saved successfully.
  The widget never clears the flag.

ResourceInstance:
- Name (String)
- LicensePlate (String) — e.g. NL-TF-02 (resource "Truck 12T ADR"; the widget shows this plate)

Resource:
- Name (String)
...

TechnicalDetails:
- NameResource (String)
- CombinationLength (Decimal, meters)
- CombinationWidth (Decimal, meters)
...

TransportOrderSequence:
- OrderSequence (Integer) — planned loading order within the TruckSelection; Auto Load
  places sequence 1 nearest the cabin (BR-24). Read via
  `loadOrderSequenceByOrderGuid` (TruckSelection → TransportOrderSequence → TransportOrder).

TransportOrder:
- TransportOrderNo (String)
- Quantity (interger)
...

PackingUnit:
- Name (String)
- Length (Decimal, meters)
- Width (Decimal, meters)
...

PackingType:
- E_PackingType (Enum, "Pallet", "Box")

Product:
- Name (String)
...

Company:
- Name (String)
...

NEW:
TCSLoadingMeter.PackingPlan (1 per TruckSelection)
  └─ PackingPlanItem (1-* per plan)
      └─ TransportOrder (reference to existing entity)
```

## Truck Rendering Measurements (m → px)

The widget reads `TechnicalDetails.CombinationLength` (L) and `CombinationWidth` (W) in meters and renders each truck through one uniform per-truck scale. One drawing serves every truck: the background image (1275 × 271 px natural) renders at **100% canvas width (1800 × 382.59 px), pinned to the canvas top** — identical for every truck. Only the frame (loading area) varies.

**Conversion rules** (constants in `src/core/constants/canvas.ts`):

| Step | Rule |
|------|------|
| Fits check | `L × (297 / W) ≤ 1453` → **fits** (case 1); otherwise **capped** (case 2) |
| Scale (fits) | `297 / W` px per meter (`TRUCK_FRAME_HEIGHT_PX / W`) |
| Scale (capped) | `1453 / L` px per meter (`TRUCK_CANVAS_WIDTH / L`) |
| Frame size (fits) | `L × scale` long × 297 px tall |
| Frame size (capped) | 1453 px long × `W × scale` tall |
| Frame x | 333 px (`TRUCK_CANVAS_LEFT`) — also the load-meter front |
| Frame y | `191.29 − frameHeight / 2` (`TRUCK_DRAWING_MIDLINE_Y`) — centered on the drawing midline |
| Drawn bed band | y 42.35 → 341.65 px (image loading rect at raw (234, 30), 1030 × 212) — every frame stays inside |
| Cargo | Same per-truck uniform scale, so capacities keep true proportions (12T Euro pallets: 8 × 3 = 24) |

**Fleet measurements** (verified against `datamodelmodule$technicaldetails`; locked by the fleet suite in `src/infrastructure/adapters/__tests__/truckAdapter.spec.ts`):

| Truck (TechnicalDetails.NameResource) | Size (m, L × W) | Case | Scale (px/m) | Frame (px, long × tall) | Position (x, y) |
|---|---|---|---|---|---|
| Car / Car ADR 2 axels / Car Coole Freeze | 0.60 × 0.90 | fits | 330.00 | 198 × 297 | (333, 42.79) |
| Van / Van ADR / Van Coole Freeze | 3.00 × 1.60 | fits | 185.63 | 556.88 × 297 | (333, 42.79) |
| Truck 20FT | 6.06 × 2.44 | fits | 121.72 | 737.63 × 297 | (333, 42.79) |
| Truck 12T / 12T ADR / 12T Coole Freeze / 20FT Coole Freeze | 10.00 × 2.40 | fits | 123.75 | 1237.50 × 297 | (333, 42.79) |
| Truck 40T / 40T ADR / 40T Coole Freeze / 40FT ADR | 12.192 × 2.350 | capped | 119.18 | 1453 × 280.06 | (333, 51.26) |
| Truck 40FT / 40FT Cool Freeze | 12.192 × 2.352 | capped | 119.18 | 1453 × 280.30 | (333, 51.14) |
| Truck Tautliner (NL-NG-05 / NL-QZ-06 / NL-MS-07) | 13.60 × 2.45 | capped | 106.84 | 1453 × 261.75 | (333, 60.42) |
| Truck and Hanger 40 T / 40FT | 17.93 × 2.352 | capped | 81.04 | 1453 × 190.60 | (333, 95.99) |
| Truck 20FT ADR / 20T ADR / 20T Coole Freeze | 20.00 × 2.352 | capped | 72.65 | 1453 × 170.87 | (333, 105.86) |
| Default fallback (missing dimensions) | 13.60 × 2.45 | capped | 106.84 | 1453 × 261.75 | (333, 60.42) |

Example derivations:

- **Truck 12T** (10 × 2.4 m): fits → scale = 297/2.4 = **123.75 px/m** → frame = 10 × 123.75 = **1237.50 × 297 px** at (333, 42.79) — fills the drawn bed (42.35 → 341.65).
- **Truck Tautliner** (13.6 × 2.45 m): 13.6 × (297/2.45) > 1453 → capped → scale = 1453/13.6 = **106.84 px/m** → frame = **1453 × 261.75 px** at (333, 60.42).

## Save Flow (Delete + Recreate)

1. User clicks "Save Plan" on the widget
2. Widget calls `onSavePlan` callback → container's `handleSavePlan`
3. Container calls `savePackingPlan()` in `mendixDataAdapter.ts`
4. `savePackingPlan`:
   a. Serializes current canvas state to `PackingPlanData` (meters)
   b. Queries for existing `PackingPlan` for this `TruckSelection`
   c. If plan exists: delete all existing `PackingPlanItem` records; if not: create a new `PackingPlan`
   d. Create new `PackingPlanItem` records for each canvas item, setting the `TransportOrder` reference with the **module-prefixed Domain Model association name** (`TCSLoadingMeter.PackingPlanItem_TransportOrder`)
   e. Map each item's packing-unit payload back using its own GUID key (not array index), so a batch response that is reordered/filtered cannot cross-assign items to the wrong TransportOrder
   f. Commit all changes
5. Container calls `onSavePlan` microflow callback (if configured)

> If an association cannot be resolved, the adapter logs a contextual `console.warn` before applying a bounded fallback — it never silently swallows the error.

## Load Flow (On Page Open)

1. Widget initializes → container's `useEffect` runs
2. Container calls `loadPackingPlan()` in `mendixDataAdapter.ts`
3. `loadPackingPlan`:
   a. Queries for `PackingPlan` where `TruckSelection = {truckGuid}`
   b. If found, queries for all `PackingPlanItem` records
   c. Reads the `TransportOrder` reference via the MxObject API using the module-prefixed association name (associations are **not** in `getAttributes()`; they are read separately with `mxObject.get(...)`)
   d. Converts items to `PackingPlanData` (meters)
   e. Deserializes to `CargoItem[]` (pixels) using `deserializePlan()`
4. When the caller supplies the truck's **current** TransportOrder set (the order of
   `transportOrders` in the TruckSelection), `loadPackingPlan` keeps only items whose
   resolved TransportOrder GUID is still in that set — items of an order removed from the
   TruckSelection since the plan was saved are not restored onto the canvas (the cargo
   list already dropped them). Omitting the set keeps the historical no-filter behavior.
5. Container passes restored items to widget as `initialCanvasItems`
6. Widget renders canvas with restored items

## Cargo Load Batch Contract (test mocks)

`loadCargoItems` resolves cargo in three ordered `mx.data.get` batches, and
`loadTruckAndScale` walks the association chain one `mx.data.get` per hop
(TruckSelection → ResourceInstance → Resource → TechnicalDetails). Test doubles
that stand in for MxObjects must therefore provide the full `isMxObject` trio
(`get`, `set`, `getAttributes`) plus `getGuid()` — without them every association
read (`getReferenceGuids`) and GUID-keyed batch pairing silently degrades to
fallbacks.

- Batch 1: TransportOrders (read `TCSTransportModule.TransportOrder_PackingUnit`)
- Batch 2: PackingUnits (read `DataModelModule.PackingUnit_PackingType`, Length/Width/Height/WeightKg)
- Batch 3: PackingTypes (read `E_PackingType`)
- Cargo ids stay keyed by the TransportOrder GUID (`cargo-<orderGuid>`), so restored
  items match the pallet list regardless of batch response order.

## Mendix Microflow Integration

The widget's `onSavePlan` and `onLoadPlan` properties can be configured in
Mendix Studio Pro to trigger microflows. The container calls these callbacks
after the save/load operations complete.

### Microflow: SavePackingPlan

- **Input**: TruckSelection (object), CanvasItems (list)
- **Steps**:
  1. Find existing PackingPlan for TruckSelection
  2. If exists, delete all PackingPlanItem children
  3. If not exists, create new PackingPlan
  4. For each canvas item, create a PackingPlanItem
  5. Commit

### Microflow: LoadPackingPlan

- **Input**: TruckSelection (object)
- **Steps**:
  1. Find PackingPlan for TruckSelection
  2. If found, retrieve all PackingPlanItem children
  3. Return as list

## XPath Queries

### Find PackingPlan for a Truck

```
//TCSLoadingMeter.PackingPlan[TCSLoadingMeter.PackingPlan_TruckSelection = '{truckGuid}']
```

> **Association names use the module-prefixed Domain Model name** (e.g., `TCSLoadingMeter.PackingPlanItem_TransportOrder`), never a raw DB table name. Missing the module prefix lets `set()`/`get()` succeed silently but persist `null`.

### Find PackingPlanItems for a Plan

```
//TCSLoadingMeter.PackingPlanItem[TCSLoadingMeter.PackingPlanItem_PackingPlan = '{planGuid}']
```

_(or `//TCSLoadingMeter.PackingPlanItem[TCSLoadingMeter.PackingPlan = '{planGuid}']` depending on association name in Domain Model)_

## Notes

- The `PositionX` and `PositionY` are relative to the truck's internal origin
  (top-left corner of the truck interior), not the canvas origin.
- The `Length` and `Width` are the item's footprint dimensions in meters (before rotation).
  `Height` is stored as 0 because the canvas is 2D (no Z axis).
- The `Rotation` is stored as an integer (0, 90, 180, 270) representing
  clockwise rotation in degrees.
- The `Color` is stored as a string for display purposes (e.g., "orange" for
  pallets, "blue" for boxes).
- `LengthMeters`, `WidthMeters`, and `WeightKg` are optional and used for
  validation (load-meter and payload checks).
