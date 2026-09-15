import { Component, createElement } from "react";
import ScrollToTop from "react-scroll-to-top";

export class preview extends Component {
    render() {
        return <div className="App">
        <ScrollToTop smooth color="#6f00ff" />       
      </div>;
    }
}

export function getPreviewCss() {
    return require("./ui/STCScrollToTop.css");
}
