import { createElement, type ReactElement } from "react";
import { LoadingCanvasContainer } from "./presentation/widget/LoadingCanvas.container";
import type { LoadingCanvasContainerProps } from "../typings/LoadingCanvasProps";
import { DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } from "./core/constants/canvas";
import "./presentation/widget/LoadingCanvas.css";

export function LoadingCanvas(props: LoadingCanvasContainerProps): ReactElement {
  const {
    truckSelection,
    transportOrders,
    session,
    canvasWidth = DEFAULT_CANVAS_WIDTH,
    canvasHeight = DEFAULT_CANVAS_HEIGHT,
    onSavePlan,
    onLoadPlan,
  } = props;

  const truckItems = truckSelection?.items?.map((item) => item.id) ?? [];
  const orderGuids = transportOrders?.items?.map((item) => item.id) ?? [];
  const sessionItems = session?.items?.map((item) => item.id) ?? [];

  return createElement(LoadingCanvasContainer, {
    truckSelection: truckItems,
    transportOrders: orderGuids,
    session: sessionItems,
    canvasWidth,
    canvasHeight,
    // ActionValue contract: execute only when the microflow can run (Mendix 10).
    onSavePlan: () => {
      if (onSavePlan?.canExecute !== false) onSavePlan?.execute();
    },
    onLoadPlan: () => {
      if (onLoadPlan?.canExecute !== false) onLoadPlan?.execute();
    },
  });
}
