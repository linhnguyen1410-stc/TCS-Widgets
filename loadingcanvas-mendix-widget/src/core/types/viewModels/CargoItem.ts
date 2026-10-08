import type { GeometryItem } from "../geometry";
export type CargoType = "pallet" | "box";

export interface CargoItem extends GeometryItem {
  id: string;
  name: string;
  type: CargoType;
  color: string;
  isLocked: boolean;
  lengthM?: number; // Footprint length in meters
  widthM?: number; // Footprint width in meters
  weightKg?: number; // Weight in kg for payload validation
  quantity?: number;
  // Planned loading order from TransportOrderSequence.OrderSequence (BR-24);
  // undefined when the truck carries no sequence data.
  sequence?: number;
  transportOrderNo?: string; // Transport Order Number
  productName?: string; // Product name from TransportOrder -> Product association
  producerName?: string; // Company name via TransportOrder -> Producer association
  companyFromName?: string; // Company name via TransportOrder -> Company_From association
  companyToName?: string; // Company name via TransportOrder -> Company_To association
}
