import { Component, createElement, useEffect,useRef } from "react";
import Big from "big.js";
import "./ui/STCTimer.css";

export function STCTimer({ durationAttr, isRunningAttr, isFinishedAttr, displayFormat, onSaveAction, autoSaveInterval }) {    
        const autoSaveCounterRef = useRef(0);
        const formatTime = (totalSeconds) => {
            
            const s = totalSeconds ? Number(totalSeconds.toString()) : 0;
            
            const hours = Math.floor(s / 3600); // Hours = S / 3600 
            const minutes = Math.floor((s % 3600) / 60); // Minutes = (S mod 3600) / 60 
            const seconds = s % 60; // Seconds = S mod 60 

            const pad = (n) => String(n).padStart(2, '0'); 

            if (displayFormat === "mmss") return `${pad(minutes)}:${pad(seconds)}`;
            if (displayFormat === "ss") return `${pad(seconds)}`;
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };
    
   
    useEffect(() => {
        let interval = null;
        
        const saveThreshold = autoSaveInterval ? Number(autoSaveInterval) : 30;
        if (isRunningAttr.value === true && isFinishedAttr.value !== true) {
            interval = setInterval(() => {
                if (durationAttr.value !== undefined && !durationAttr.readOnly) {
                    const currentValue = durationAttr.value ? durationAttr.value : new Big(0);     
                    durationAttr.setValue(currentValue.plus(1));                    
                    autoSaveCounterRef.current += 1;
                    if (autoSaveCounterRef.current >= saveThreshold) {
                        if (onSaveAction && onSaveAction.canExecute && !onSaveAction.isExecuting) {
                            console.log(`Auto save in ${saveThreshold} seconds...`);
                            onSaveAction.execute();
                        }
                        autoSaveCounterRef.current = 0; // Reset bộ đếm về 0
                    }
                }
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunningAttr.value, isFinishedAttr.value, durationAttr, onSaveAction, autoSaveInterval]);

    return (
        <div className="stc-timer-container">
            <span className="stc-timer-display">
                {formatTime(durationAttr.value)}
            </span>
            {isFinishedAttr.value && <div className="stc-timer-finished-label">COMPLETED</div>}
        </div>
    );
}
