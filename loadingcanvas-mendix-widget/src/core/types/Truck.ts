// business data from Mendix, unit in meters, kg

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
