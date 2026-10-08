import type { GeometryItem } from "../geometry";
import type { Truck } from "../Truck";

export interface TruckItem extends GeometryItem {
  id: Truck["id"];
  code: Truck["code"];
  truckType: Truck["truckType"];
  maxPayloadKg: Truck["maxPayloadKg"];
  axleCount: Truck["axleCount"];
  maxLoadMeters?: number; // Maximum load meters along truck length
}
