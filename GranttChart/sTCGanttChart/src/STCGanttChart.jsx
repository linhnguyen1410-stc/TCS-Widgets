import { Component, createElement } from "react";

import { GanttChartComponent } from "./components/GanttChartComponent";
import "./ui/STCGanttChart.css";

export class STCGanttChart extends Component {
    render() {
        /**
         * Destructure all properties from this.props. 
         * These keys must match the 'key' attributes defined in your STCGanttChart.xml.
         */
        const { 
            taskDataSource, 
            taskName, 
            startDate, 
            endDate, 
            progress,
            dependencies 
        } = this.props;

        /**
         * Pass the Mendix objects/datasources as props to the functional component.
         * The child component will handle the mapping logic using these props.
         */
        return (
            <GanttChartComponent 
                taskDataSource={taskDataSource}
                taskName={taskName}
                startDate={startDate}
                endDate={endDate}
                progress={progress}
                dependencies={dependencies}
            />
        );
    }
}
