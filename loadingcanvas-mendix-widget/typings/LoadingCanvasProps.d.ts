/**
 * This file was generated from LoadingCanvas.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { CSSProperties } from "react";
import { ActionValue, ListValue } from "mendix";

export interface LoadingCanvasContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    truckSelection?: ListValue;
    transportOrders?: ListValue;
    session?: ListValue;
    canvasWidth: number;
    canvasHeight: number;
    onSavePlan?: ActionValue;
    onLoadPlan?: ActionValue;
}

export interface LoadingCanvasPreviewProps {
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    truckSelection: {} | { caption: string } | { type: string } | null;
    transportOrders: {} | { caption: string } | { type: string } | null;
    session: {} | { caption: string } | { type: string } | null;
    canvasWidth: number | null;
    canvasHeight: number | null;
    onSavePlan: {} | null;
    onLoadPlan: {} | null;
}
