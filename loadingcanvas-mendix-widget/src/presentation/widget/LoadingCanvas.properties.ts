import type { CargoItem } from "../../core/types/viewModels/CargoItem";
import type { TruckItem } from "../../core/types/viewModels/TruckItem";
import type { MxObject } from "../../core/types/mx";

export interface LoadingCanvasProps {
  truckSelection?: Array<MxObject | string | { guid?: string; id?: string }>;
  transportOrders?: string[];
  session?: Array<MxObject | string | { guid?: string; id?: string }>;
  canvasWidth: number;
  canvasHeight: number;
  onSavePlan?: () => void;
  onLoadPlan?: () => void;
}

export interface LoadingCanvasViewModelProps {
  truck: TruckItem | null;
  availableCargo: CargoItem[];
  initialCanvasItems: CargoItem[];
  scale: { widthScale: number; heightScale: number };
  canvasWidth: number;
  canvasHeight: number;
  saveError?: string | null;
  onSavePlan: (items: CargoItem[], scale: { widthScale: number; heightScale: number }) => void;
  onLoadPlan: () => void;
  // Verify-finalize chain (BR-47): save the plan then set CompleteLoading.
  onVerifyFinalize: (items: CargoItem[]) => Promise<boolean>;
}

export interface LoadingCanvasViewProps {
  viewModel: LoadingCanvasViewModelProps;
  isLoading: boolean;
}
