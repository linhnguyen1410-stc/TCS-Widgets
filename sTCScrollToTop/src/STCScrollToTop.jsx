import React from "react";
import { Component, createElement, useState } from "react";
import ScrollToTop from "./components/ScrollToTopComponent"
import "./ui/STCScrollToTop.css";

export class STCScrollToTop extends Component {
    render() {
        return <div className="App">
        <ScrollToTop smooth color="#6f00ff" elementClassName={this.props.elementClassName}/>       
      </div>;
    }
}