import { createElement, useMemo } from "react";
import { Gantt, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";

/**
 * GanttChartComponent - A React wrapper for Mendix Pluggable Widget
 * @param {Object} props - Properties passed from Mendix Studio Pro
 */
export function GanttChartComponent({ 
    taskDataSource, 
    taskName, 
    startDate, 
    endDate, 
    progress,
    dependencies 
}) {
    
    // Memoize the task mapping to optimize performance and prevent unnecessary re-renders
    const tasks = useMemo(() => {
        // Step 1: Safety check. Ensure the datasource is ready and contains items.
        // This prevents the "ReferenceError: _object is not defined" error.
        if (taskDataSource.status !== "available" || !taskDataSource.items) {
            return [];
        }

        // Step 2: Map Mendix objects to the format required by react-gantt-task-react
        return taskDataSource.items.map(item => {
            // Retrieve values using the .get(item) method provided by Mendix API
            const nameValue = taskName.get(item).value || "Unnamed Task";
            const startValue = startDate.get(item).value || new Date();
            const endValue = endDate.get(item).value || new Date();
            const progressValue = progress.get(item).value || 0;
            /**
             * Parsing logic:
             * Split the string by commas and trim whitespace to create a clean array of IDs.
             * Example: "Task1, Task2" becomes ["Task1", "Task2"]
             */
            const parsedDependencies = depValue 
                ? depValue.split(',').map(id => id.trim()) 
                : [];
            return {
                id: item.id, // Unique ID from the Mendix Object
                name: nameValue,
                start: startValue,
                end: endValue,
                progress: progressValue,
                type: "task",
                // Custom styles for the task bars
                styles: { 
                    progressColor: '#3b82f6', 
                    progressSelectedColor: '#2563eb',
                    backgroundColor: '#d1d5db'
                }
            };
        });
    }, [taskDataSource, taskName, startDate, endDate, progress]);

    // Step 3: Handle the loading state gracefully
    if (taskDataSource.status === "loading") {
        return <div className="gantt-loading">Loading chart data...</div>;
    }

    // Step 4: Handle empty data case
    if (tasks.length === 0) {
        return <div className="gantt-empty">No tasks found in the list.</div>;
    }

    // Step 5: Render the Gantt Chart
    return (
        <div className="gantt-wrapper" style={{ height: '400px', width: '100%' }}>
            <Gantt 
                tasks={tasks} 
                viewMode={ViewMode.Day} // Default view mode set to Day
                listCellWidth="200px"   // Width of the left-side task list
                columnWidth={65}        // Width of the timeline columns
                barCornerRadius={4}     // Styling: rounded corners for task bars
            />
        </div>
    );
}