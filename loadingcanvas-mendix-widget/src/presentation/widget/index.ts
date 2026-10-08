/**
 * Widget entry point for Mendix Pluggable Widget.
 *
 * In a Mendix project, this file is the build entry point.
 * Mendix's widget plugin will bundle this file and its dependencies
 * into the widget's JavaScript output.
 *
 * The LoadingCanvasContainer is the Mendix-facing component that:
 * - Receives props from Mendix (object references, canvas dimensions, callbacks)
 * - Resolves object references via mx.data API
 * - Converts them to view models using adapters
 * - Passes view models to the LoadingCanvas widget
 */
export { LoadingCanvasContainer } from "./LoadingCanvas.container";
export type {
  LoadingCanvasProps,
  LoadingCanvasViewModelProps,
  LoadingCanvasViewProps,
} from "./LoadingCanvas.properties";
