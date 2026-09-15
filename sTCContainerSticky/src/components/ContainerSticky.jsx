import React, { useEffect, useState } from 'react';
import Moveable from "moveable";

export function ContainerSticky() {
    const [chatWidth, setChatWidth] = useState(undefined);
    const [sidebarTop, setSidebarTop] = useState(undefined);
    //var enableMovement = this.props.enableMove;
    var moveable = null;

    
    const scrollContainer = document.querySelector('.mx-scrollcontainer-center').querySelector('.mx-scrollcontainer-wrapper'); 
    useEffect(() => {

        const chatEl = document.querySelector('.containerbar').getBoundingClientRect();
        setChatWidth(chatEl.width);        
        //setSidebarTop(chatEl.top);
        setSidebarTop(275);
    }, []);

    useEffect(() => {
        if (!sidebarTop) return;
        scrollContainer.addEventListener('scroll', isSticky);
        return () => {
          scrollContainer.removeEventListener('scroll', isSticky);
        };
    }, [sidebarTop]);
    
   var isSticky = function (e) {
    
        const chatEl = document.querySelector('.containerbar');
        if(chatEl == null || chatEl == undefined) return;
        const scrollTop = scrollContainer.scrollTop;
        if (scrollTop >= sidebarTop - 30) {
            if (chatEl.classList.contains('is-sticky') == false && chatEl.classList.contains('is-sticky-draggable') == false)
            {
                    if (chatEl.classList.contains('is-sticky-draggable') == true)
                    {
                        chatEl.classList.remove('is-sticky-draggable');   
                    }
                    chatEl.classList.add('is-sticky');
                    chatEl.style.right = '5px';
                    chatEl.style.bottom = '5px';
                   // if (enableMovement == true)
                   // {
                     const moveableControl = chatEl.querySelector('.mx-grid-controlbar'); 
                     //const moveableParent =  document.querySelector('.containerbar');
                    //#region 
                    // moveable configuration
                    if(moveable == null || moveable == undefined)
                        { 
                            moveable = new Moveable(scrollContainer, {
                                target: moveableControl,
                               // target: chatEl,
                                // If the container is null, the position is fixed. (default: parentElement(document.body))
                                container: scrollContainer,
                                draggable: true,
                                resizable: false,
                                scalable: false,
                                rotatable: false,
                                warpable: false,
                                // Enabling pinchable lets you use events that
                                // can be used in draggable, resizable, scalable, and rotateable.
                                pinchable: true, // ["resizable", "scalable", "rotatable"]
                                origin: true,
                                keepRatio: true,
                                // Resize, Scale Events at edges.
                                edge: true,
                                throttleDrag: 0,
                                throttleResize: 0,
                                throttleScale: 0,
                                throttleRotate: 0,
                        });
                        /* draggable */
                        
                        moveable.on("dragStart", ({ target, clientX, clientY }) => {
                            
                        if (chatEl.classList.contains('is-sticky-draggable') == false)
                        {
                                chatEl.classList.add('is-sticky-draggable');  
                        }
                        if (chatEl.classList.contains('is-sticky') == true)
                        {
                            chatEl.classList.remove('is-sticky');   
                        }                      
                            chatEl.style.cursor = 'move';
                            

                        }).on("drag", ({
                            target, transform,
                            left, top, right, bottom,
                            beforeDelta, beforeDist, delta, dist,
                            clientX, clientY,
                        }) => {
                            target.style.transform = e.transform;
                            target.style.cursor = 'move';

                            target.style.right = `${right}px`;
                            target.style.bottom = `${bottom}px`;
                            chatEl.style.right = `${right}px`;
                            chatEl.style.bottom = `${bottom}px`;
                        //console.log("right:" + right + "; bottom:" + bottom);
                        //console.debug("right:" + right + "; bottom:" + bottom);
                            
                        }).on("dragEnd", ({ target, isDrag, clientX, clientY }) => {
                            console.log("onDragEnd", target, isDrag);
                            chatEl.style.cursor = 'pointer';
                        });
                    //}
                }
                    //#endregion
            }
                       
        } else {
            if (chatEl.classList.contains('is-sticky') == true)
            {
                chatEl.classList.remove('is-sticky');   
            }
            if (chatEl.classList.contains('is-sticky-draggable') == true)
            {
                chatEl.classList.remove('is-sticky-draggable');   
            }           
            if(moveable != null && moveable != undefined)
            {
                moveable.destroy();
                moveable = null;
            }
            //
            chatEl.style.right = 'initial';
            chatEl.style.bottom = 'initial';
            
            var moveableCtrlList = document.querySelectorAll(".moveable-control-box");
            if(moveableCtrlList.length > 0)
            {
                moveableCtrlList.forEach(e => e.remove());
            }           
                
        }
   }

    return;
}


 
