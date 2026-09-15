import { createElement } from "react";
import { ContainerSticky } from "./components/ContainerSticky";

export function preview({ sampleText }) {
    return <ContainerSticky sampleText={sampleText} />;
}

export function getPreviewCss() {
    return require("./ui/STCContainerSticky.css");
}
