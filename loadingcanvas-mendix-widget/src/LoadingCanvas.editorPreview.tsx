import { ReactElement } from "react";
import { LoadingCanvasPreviewProps } from "../typings/LoadingCanvasProps";
import { CANVAS_BACKGROUND_COLOR } from "./core/constants/theme";

export function preview(_values: LoadingCanvasPreviewProps): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: 100,
        border: "2px dashed #888",
        borderRadius: 4,
        backgroundColor: CANVAS_BACKGROUND_COLOR,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#666",
        fontSize: 14,
      }}>
      Loading Canvas
    </div>
  );
}

export function getPreviewCss(): string {
  return require("./presentation/widget/LoadingCanvas.css");
}
