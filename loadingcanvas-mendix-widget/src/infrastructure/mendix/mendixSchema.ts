// Mendix Domain Model schema names. All entity/association/XPath literals for
// this widget live here; logic modules must import from this file only.

// RESTORED FILE NOTE: a previous edit stripped all double quotes from this file
// (invalid TypeScript, TS1109) and used an unverified association prefix. The
// content below is restored from git HEAD with the verified association fix:
// the Mendix domain model (microflow AssociationId) requires
// "TCSLoadingMeter.TruckSelection_ResourceInstance" - the module-prefixed name.

export const PACKING_PLAN_ENTITY = "TCSLoadingMeter.PackingPlan";
export const PACKING_PLAN_ATTRIBUTES = {
  createdDate: "CreatedDate",
  modifiedDate: "ModifiedDate",
} as const;
export const PACKING_PLAN_ITEM_ENTITY = "TCSLoadingMeter.PackingPlanItem";
export const PACKING_PLAN_XPATH = "//TCSLoadingMeter.PackingPlan";
export const PACKING_PLAN_ITEM_XPATH = "//TCSLoadingMeter.PackingPlanItem";

export const PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION = "TCSLoadingMeter.PackingPlan_TruckSelection";
export const PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION_FALLBACK = "PackingPlan_TruckSelection";
export const PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION = "TCSLoadingMeter.PackingPlanItem_TransportOrder";
export const PACKING_PLAN_ITEM_TRANSPORT_ORDER_ASSOCIATION_FALLBACK = "PackingPlanItem_TransportOrder";

export const PACKING_PLAN_TRUCK_ASSOCIATIONS: readonly string[] = [
  PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION,
  PACKING_PLAN_TRUCK_SELECTION_ASSOCIATION_FALLBACK,
];
export const PACKING_PLAN_ITEM_ASSOCIATIONS: readonly string[] = [
  "TCSLoadingMeter.PackingPlanItem_PackingPlan",
  "PackingPlanItem_PackingPlan",
];
export const PACKING_PLAN_ITEM_PACKING_PLAN_ASSOCIATION = PACKING_PLAN_ITEM_ASSOCIATIONS[0];

// Runtime association names verified against the Mendix database (join tables):
// tcstransportmodule$transportorder_packingunit -> TCSTransportModule.TransportOrder_PackingUnit
// tcstransportmodule$transportorder_product     -> TCSTransportModule.TransportOrder_Product
// datamodelmodule$packingunit_packingtype       -> DataModelModule.PackingUnit_PackingType
// MxObject get()/set() require the OwningModule.AssociationName form; the DB is the
// source of truth for these names (see docs/MENDIX_ENTITY.md). Only the
// prefix-less dev-fixture forms are kept as bounded fallbacks.
export const TRANSPORT_ORDER_PACKING_UNIT_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.TransportOrder_PackingUnit",
  "TransportOrder_PackingUnit",
];
export const TRANSPORT_ORDER_PRODUCT_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.TransportOrder_Product",
  "TCSTransportModule.TransportOrder_DataModelModule.Product",
  "TransportOrder_Product",
];
// Runtime names verified against DB join tables (see docs/MENDIX_ENTITY.md):
// tcstransportmodule$transportorder_producer,
// tcstransportmodule$transportorder_company_from,
// tcstransportmodule$transportorder_company_to -> all point at DataModelModule.Company.
export const TRANSPORT_ORDER_PRODUCER_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.TransportOrder_Producer",
  "TransportOrder_Producer",
];
export const TRANSPORT_ORDER_COMPANY_FROM_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.TransportOrder_Company_From",
  "TransportOrder_Company_From",
];
export const TRANSPORT_ORDER_COMPANY_TO_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.TransportOrder_Company_To",
  "TransportOrder_Company_To",
];
export const PACKING_UNIT_PACKING_TYPE_ASSOCIATIONS: readonly string[] = [
  "DataModelModule.PackingUnit_PackingType",
  "DataModelModule.PackingUnit_DataModelModule.PackingType",
  "PackingUnit_PackingType",
];

// Truck dimension associations (docs/MENDIX_ENTITY.md):
// TruckSelection -> ResourceInstance (1-*) -> Resource (1-*) -> TechnicalDetails (1-1)
// TechnicalDetails attributes: NameResource (String), CombinationLength (Decimal), CombinationWidth (Decimal)
// Verified against the Mendix domain model: the owning module prefix is required
// (microflows reference "TCSLoadingMeter.TruckSelection_ResourceInstance").
export const TRUCK_SELECTION_RESOURCE_INSTANCE_ASSOCIATIONS: readonly string[] = [
  "TCSLoadingMeter.TruckSelection_ResourceInstance",
  "TruckSelection_ResourceInstance",
];

export const RESOURCE_INSTANCE_RESOURCE_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.ResourceInstance_Resource",
  "ResourceInstance_Resource",
];

export const RESOURCE_TECHNICAL_DETAILS_ASSOCIATIONS: readonly string[] = [
  "DataModelModule.Resource_TechnicalDetails",
  "Resource_TechnicalDetails",
];

export const TECHNICAL_DETAILS_ATTRIBUTES = {
  nameResource: "NameResource",
  combinationLength: "CombinationLength",
  combinationWidth: "CombinationWidth",
} as const;

export const PACKING_TYPE_ENUM_ATTRIBUTE = "E_PackingType";

// PackingPlanItem attribute names (docs/MENDIX_ENTITY.md).
export const PACKING_PLAN_ITEM_ATTRIBUTES = {
  positionX: "PositionX",
  positionY: "PositionY",
  length: "Length",
  width: "Width",
  height: "Height",
  rotation: "Rotation",
  color: "Color",
  lengthMeters: "LengthMeters",
  widthMeters: "WidthMeters",
  weightKg: "WeightKg",
} as const;

// TruckSelection attribute (docs/MENDIX_ENTITY.md; DB column verified:
// tcsloadingmeter$truckselection.completeloading boolean). Written only by the
// Verify-finalize chain after the packing plan is persisted (BR-47).
export const TRUCK_SELECTION_COMPLETE_LOADING_ATTRIBUTE = "CompleteLoading";

// TransportOrderSequence (docs/MENDIX_ENTITY.md): TruckSelection (*-1) TransportOrderSequence
// (1-*) TransportOrder. OrderSequence (integer) is the planned loading order; the widget loads
// sequence 1 nearest the cabin (BR-24). Association names verified against the DB join tables
// tcstransportmodule$transportordersequence_truckselection / ..._transportorder.
export const TRANSPORT_ORDER_SEQUENCE_ENTITY = "TCSTransportModule.TransportOrderSequence";
export const TRANSPORT_ORDER_SEQUENCE_XPATH = "//TCSTransportModule.TransportOrderSequence";
export const TRANSPORT_ORDER_SEQUENCE_ATTRIBUTES = {
  orderSequence: "OrderSequence",
} as const;

export const TRUCK_SELECTION_ORDER_SEQUENCE_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.TransportOrderSequence_TruckSelection",
  "TransportOrderSequence_TruckSelection",
];

export const ORDER_SEQUENCE_TRANSPORT_ORDER_ASSOCIATIONS: readonly string[] = [
  "TCSTransportModule.TransportOrderSequence_TransportOrder",
  "TransportOrderSequence_TransportOrder",
];
