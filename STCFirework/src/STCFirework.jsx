import { Component, createElement } from "react";
import { Fireworks } from 'fireworks-js';

import "./ui/STCFirework.css";

export class STCFirework extends Component {
    render() {       
        
        const container = document.querySelector('#content');
        var fireworks = null;
        const options = { traceSpeed:5, opacity:0.8};
        setTimeout(function() { 
            var sessionBadgesPopupLayer = document.querySelector('.mx-underlay'); 
            if(sessionBadgesPopupLayer != null && sessionBadgesPopupLayer != 'undefined')
            {
                fireworks = new Fireworks(sessionBadgesPopupLayer, options);                                   
            }
            else
            {
                fireworks = new Fireworks(container, options);     
            }          
            fireworks.start();
        }, 1000);
       setTimeout(function() {       
            fireworks.stop(true);           
            var sessionBadgesContinueBtn = document.querySelector('.session-badges-continue');
            if(sessionBadgesContinueBtn != null && sessionBadgesContinueBtn != 'undefined')
            {
                sessionBadgesContinueBtn.click();
            }
       },15000);
        

        return; 
    }
}
