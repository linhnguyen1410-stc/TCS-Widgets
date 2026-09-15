/*
    WizardSteps
    ========================

    @file      : WizardSteps.js
    @version   : 1.0.0
    @author    : Willem Gorisse
    @date      : 09/03/2016
    @copyright : Mendix 2016
    @license   : Apache 2

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate. 
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "dojo/text!WizardSteps/widget/template/WizardStepsList.html",
    "dojo/text!WizardSteps/widget/template/WizardStep.html",
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, widgetTemplate, stepTemplate) {
    "use strict";
    
    var listItemWidget = declare([ _WidgetBase, _TemplatedMixin ], {
        templateString: stepTemplate,
        
        // DOM elements
        wizardStepButton: null,
        wizardStepNumber: null,
        wizardStepTitle: null,
        wizardStepSubTitle: null,

        numberingMode: null,
        clickListener: null,
        _data: null,
        
        constructor: function(data) {
            this._data = data;
            if (!this._data.title || this._data.title === undefined){
               this._data.title = "";     
            }
            if (!this._data.subTitle || this._data.subTitle === undefined){
               this._data.subTitle = "";     
            }
			/*
			if (!this._data.stepClass || this._data.stepClass === undefined){
               this._data.stepClass = "";     
            } 
			*/
        },
        
        postCreate: function() {           
            this._updateRendering();
        },
        
        _updateRendering: function() {
            if (this._data) {
                if (this._data.title === "") {
                    dojoConstruct.destroy(this.wizardStepTitle);
                }
                if (this._data.subTitle === ""){
                    dojoConstruct.destroy(this.wizardStepSubTitle);
                }
                if (this.numberingMode == "noNumber")  {
                    dojoConstruct.destroy(this.wizardStepNumber)
                }              
                // setting classnames
                var stepClass = "wizard-step " + this._data.status;
                dojoClass.remove(this.wizardStepButton);
                dojoClass.add(this.wizardStepButton,stepClass);
            }
        }
    });
    
    // Declare widget's prototype. 
    return declare("WizardSteps.widget.WizardSteps", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        wizardStepsListNode: null,

        // Parameters configured in the Modeler.        
        wizardStep: null,
        titleAttribute: null,
        statusAttribute: null,
        sortAttribute: null,
        subTitleAttribute: null,

        progressStyling: null,
        autoWidth: null,
        layoutMode: null,
        numberingMode: null,

        navigationMicroflow: null,
        dataMicroflow: null,
        useContextObj: null,
		
		showAnimationStep: null,
		autoRefresh: null,
		refreshTime: null,
		

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _contextObj: null,
        _wizardStepList: null,
        _numberOfSteps: null,
        _dataRequestID: null,
        
		_timeout: null,
		_percentInterval:null,
		_lastCompletedStepIndex:null,

		// Constants:
		_constStepCompletedAttrName:'Completed',
		_constAnimationShowedAttrName:'AnimationShowed',

		_constStep1CompletedAttrName:'SubStep1Completed',
		_constStep2CompletedAttrName:'SubStep2Completed',
		_constStep3CompletedAttrName:'SubStep3Completed',
		_constStep1AnimationShowedAttrName:'SubStep1AnimationShowed',
		_constStep2AnimationShowedAttrName:'SubStep2AnimationShowed',
		_constStep3AnimationShowedAttrName:'SubStep3AnimationShowed',	
		
		_constStepModalityAttrName:'Modality',	

		_constPic1OutgoingActivedUrl:'/widgets/WizardSteps/widget/images/outgoing-1.png',	
		_constPic2OutgoingActivedUrl:'/widgets/WizardSteps/widget/images/outgoing-2.png',	
		_constPic3OutgoingActivedUrl:'/widgets/WizardSteps/widget/images/outgoing-3.png',	
		
		_constPic1OutgoingInactivedUrl:'/widgets/WizardSteps/widget/images/outgoing-1-gray.png',	
		_constPic2OutgoingInactivedUrl:'/widgets/WizardSteps/widget/images/outgoing-2-gray.png',	
		_constPic3OutgoingInactivedUrl:'/widgets/WizardSteps/widget/images/outgoing-3-gray.png',		
		//road
		_constPic1TransportActivedUrl:'/widgets/WizardSteps/widget/images/transport-1.png',	
		_constPic1TransportInactivedUrl:'/widgets/WizardSteps/widget/images/transport-1-gray.png',
		//rail
		_constPic2TransportActivedUrl:'/widgets/WizardSteps/widget/images/transport-2.png',	
		_constPic2TransportInactivedUrl:'/widgets/WizardSteps/widget/images/transport-2-gray.png',
		//river
		_constPic3TransportActivedUrl:'/widgets/WizardSteps/widget/images/transport-3.png',	
		_constPic3TransportInactivedUrl:'/widgets/WizardSteps/widget/images/transport-3-gray.png',
		//air
		_constPic4TransportActivedUrl:'/widgets/WizardSteps/widget/images/transport-4.png',	
		_constPic4TransportInactivedUrl:'/widgets/WizardSteps/widget/images/transport-4-gray.png',
		//sea
		_constPic5TransportActivedUrl:'/widgets/WizardSteps/widget/images/transport-5.png',	
		_constPic5TransportInactivedUrl:'/widgets/WizardSteps/widget/images/transport-5-gray.png',
			
		
		_constPic1IncomingActivedUrl:'/widgets/WizardSteps/widget/images/incoming-1.png',	
		_constPic2IncomingActivedUrl:'/widgets/WizardSteps/widget/images/incoming-2.png',	
		
		_constPic1IncomingInactivedUrl:'/widgets/WizardSteps/widget/images/incoming-1-gray.png',	
		_constPic2IncomingInactivedUrl:'/widgets/WizardSteps/widget/images/incoming-2-gray.png',	
		
        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function() {
            this._wizardStepList = [];
            this._numberOfSteps = 0;
            this._dataRequestID = 0;
			this._timeout = 0;
			this._percentInterval = 0;
			this._lastCompletedStepIndex = 0;
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function() {            

        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function(obj, callback) {
            this._contextObj = obj;
            this._resetSubscriptions();
            this._resetWidget();
            this._getData(callback);
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function(e) {
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // handle incoming data
        _getData: function(callback) {
            // add an ID to the datarequest to only handle the latest incoming request. Sometimes update and the contextobj handler are both triggered.
            this._dataRequestID = mendix.lang.getUniqueId();
            var id = this._dataRequestID;
            // function voor adding the callback to the received data
            function receivedData(objs) {
                // if the received data is not of the last request: do nothing with it
                if (id == this._dataRequestID) {
                    this._processData(objs,callback);
                }
            }

            // get new data
             if (this.dataMicroflow) {
                // if a contextObj is present, pass it to the microflow
                var dataGuids = [];
                var dataSelection = "none";
                if (this.useContextObj && this._contextObj) {
                    dataGuids = [this._contextObj.getGuid()];
                    dataSelection = "selection";
                }
                mx.data.action({
                    params: {
                        actionname: this.dataMicroflow,
                        applyto: dataSelection,
                        guids: dataGuids
                    },
                    callback: dojoLang.hitch(this,receivedData)
                },this);
               
            }
        },
        
        _processData: function(objs,callback) {
            // if a list already exist: reset the widget
            if (this._wizardStepList && this._wizardStepList.length > 0) {
                this._resetWidget();
            }

            var step;
								
            // create a data list with all the steps
            this._wizardStepList = dojo.map(objs,dojoLang.hitch(this,function(stepContext,i) { 
				var _animationShowed = false;
				var _stepCompleted = false;
				var _step1Completed = false; 
				var _step2Completed = false;	
				var _step3Completed = false;
				var _step1AnimationCompleted = false;
				var _step2AnimationCompleted = false;
				var _step3AnimationCompleted = false;
	
				if(stepContext.has(this._constStepCompletedAttrName))
					_stepCompleted = stepContext.get(this._constStepCompletedAttrName);
				if(stepContext.has(this._constAnimationShowedAttrName))
					_animationShowed = stepContext.get(this._constAnimationShowedAttrName);	
				if(stepContext.has(this._constStep1CompletedAttrName))
					_step1Completed = stepContext.get(this._constStep1CompletedAttrName);
				if(stepContext.has(this._constStep2CompletedAttrName))
					_step2Completed = stepContext.get(this._constStep2CompletedAttrName);
				if(stepContext.has(this._constStep3CompletedAttrName))
					_step3Completed = stepContext.get(this._constStep3CompletedAttrName);
				if(stepContext.has(this._constStep1AnimationShowedAttrName))
					_step1AnimationCompleted = stepContext.get(this._constStep1AnimationShowedAttrName);
				if(stepContext.has(this._constStep2AnimationShowedAttrName))
					_step2AnimationCompleted = stepContext.get(this._constStep2AnimationShowedAttrName);	
				if(stepContext.has(this._constStep3AnimationShowedAttrName))
					_step3AnimationCompleted = stepContext.get(this._constStep3AnimationShowedAttrName);
                step = {
                    context:stepContext,
                    status:stepContext.get(this.statusAttribute),
                    numberingMode:this.numberingMode,
                    title:stepContext.get(this.titleAttribute),
                    subTitle:stepContext.get(this.subTitleAttribute),
					animationShowed:_animationShowed,
					stepCompleted:_stepCompleted,
  					step1Completed:_step1Completed,
					step2Completed:_step2Completed,
					step3Completed:_step3Completed,
					step1AnimationShowed:_step1AnimationCompleted,
					step2AnimationShowed:_step2AnimationCompleted,
					step3AnimationShowed:_step3AnimationCompleted
                };
                // define number on type of number
                switch(this.numberingMode){
                    case "autoNumber":
                        step.number = i + 1;
                        break;
                    case "sortNumber":
                        step.number = stepContext.get(this.sortAttribute);
                        break;
                    case "noNumber":
                    default:
                        step.number = -1;
                }
               
                return step;
            }));

            this._numberOfSteps = this._wizardStepList.length;
            
            this._updateRendering(callback);
			this._setupStylesheetClass(callback);
			/*
			if(this.showAnimationStep)
			{
				this._setupEvents(callback);
			}
			*/
        },
        
         // Rerender the interface
        _updateRendering: function(callback) {
            var listItemData,
                ulClassName = "wizard-steps";
            
            switch (this.layoutMode) {
                case "verticalMode":
                    ulClassName += " vertical-wizard-steps";
                    break;
                case "horizontalMode":
                default:
                    ulClassName += " horizontal-wizard-steps";
            }
            // set proper classname on the ul
            if (this.autoWidth && this.layoutMode == "horizontalMode") {
                ulClassName += " wizard-" + this._numberOfSteps + "-steps";
            }
			// set animation running classname on the ul
            if (this.showAnimationStep) {
                ulClassName += " wizard-show-animation-steps";
            }
			
            dojoClass.remove(this.wizardStepsListNode);
            dojoClass.add(this.wizardStepsListNode,ulClassName);
            if (this.progressStyling) {
                dojoClass.add(this.wizardStepsListNode, "wizard-progress");
            }
            
            // create list items 
            dojoArray.forEach(this._wizardStepList,dojoLang.hitch(this,function(step,i){
				
				var _showpic1 = true;
				var _showpic2 = true;
				var _showpic3 = true;
				var pic1 = this._constPic1OutgoingActivedUrl;
				var pic1gray = this._constPic1OutgoingInactivedUrl;;
				
				var pic2 = this._constPic2OutgoingActivedUrl;
				var pic2gray = this._constPic2OutgoingInactivedUrl;
				
				var pic3 = this._constPic3OutgoingActivedUrl;
				var pic3gray = this._constPic3OutgoingInactivedUrl;
				
				if(step.status == "Transport")
				{
					pic1 = this._constPic1TransportActivedUrl;
					pic1gray = this._constPic1TransportInactivedUrl;
					_showpic2 = false;
					_showpic3 = false;
					//Start to check modality
					var stepModality = 'Road';
					var stepModalityObjectId = 0;
					if(step.context.has(this._constStepModalityAttrName))
						stepModality = step.context.get(this._constStepModalityAttrName);
					/*	
					mx.data.get({
						guid: stepModalityObjectId,
  					    xpath: "//DataModelModule.Modality",
						callback: function(obj) {
							if(obj != null && obj != undefined)
							{
								if(obj.has('E_Modality'))
									stepModality = obj.get('E_Modality');
							}
						}
					});
					/*
					mx.data.action({
						params: {
							applyto: "selection",
							actionname: "RequestDataModule.DS_Modality_GetById",
							guids: [stepModalityObjectId],
							origin: this.mxform
						},
						callback: function(obj) {
							// expect single MxObject
							if(obj != null && obj != undefined)
							{
								if(obj.has('E_Modality'))
									stepModality = obj.get('E_Modality');
							}
						},
						error: function(error) {
							alert(error.description);
						}
					}, this);
					*/
					switch(stepModality) {
					  case 'Rail':  // picture 2
						pic1 = this._constPic2TransportActivedUrl;
					    pic1gray = this._constPic2TransportInactivedUrl;
						break;
					  case 'River':  // picture 3
						pic1 = this._constPic3TransportActivedUrl;
					    pic1gray = this._constPic3TransportInactivedUrl;
						break;   // picture 4 in the list
					  case 'Air':
						pic1 = this._constPic4TransportActivedUrl;
					    pic1gray = this._constPic4TransportInactivedUrl;
						break;
					  case 'Sea':  // picture 5 in the list
						pic1 = this._constPic5TransportActivedUrl;
					    pic1gray = this._constPic5TransportInactivedUrl;
						break;
					  default: // road with picture 1
						// code block
					}
				}
				else if (step.status == "Discharge") {
					pic1 = this._constPic1IncomingActivedUrl;
					pic1gray = this._constPic1IncomingInactivedUrl;
					pic2 = this._constPic2IncomingActivedUrl;
					pic2gray = this._constPic2IncomingInactivedUrl;
					_showpic3 = false;
				}
				else {
				}
				if(step.step1Completed)
					pic1gray = pic1;
				if(step.step2Completed)
					pic2gray = pic2;
				if(step.step3Completed)
					pic3gray = pic3;	
				var _className = '';
				if(step.stepCompleted)
				{
					_className = 'wizard-step-completed-without-animation';	
					this._lastCompletedStepIndex = i;	
								
				}
				if(_className == '')
				{
					_className = 'step-node';
				}
				
                listItemData = {
                    dataId:i,
                    numberingMode:step.numberingMode,
                    number:step.number,
                    status:step.status,
                    title:step.title,
					stepClass:_className,
                    subTitle:step.subTitle,
                    contextObject:step.context,
					pic1:this.showAnimationStep ? pic1gray : pic1,
					pic2:this.showAnimationStep ? pic2gray : pic2,
					pic3:this.showAnimationStep ? pic3gray : pic3,
					showpic1:_showpic1 ? 'block' : 'none',
					showpic2:_showpic2 ? 'block' : 'none',
					showpic3:_showpic3 ? 'block' : 'none',
                };
                
                step.listItemWidget = new listItemWidget(listItemData);
				
                this._setupSpecEvent(step);
                dojoConstruct.place(step.listItemWidget.domNode,this.wizardStepsListNode,"last");
            }));
            
            if(this._numberOfSteps > 0)
			{
				var _lastStepclassName = 'laststep';
				if(this._wizardStepList[this._numberOfSteps - 1].animationShowed) {
					_lastStepclassName = 'wizard-step-completed-without-animation laststep';
				}
				var picBlank = '/widgets/WizardSteps/widget/images/blank.png';
				// add finish step at the end of progress 
				listItemData = {
                    dataId:this._numberOfSteps,
                    numberingMode:'sortNumber',
                    number:'End',
                    status:'',
                    title:'Finished',
					stepClass:_lastStepclassName,
					pic1:picBlank,
					pic2:picBlank,
					pic3:picBlank,
					showpic1:'none',
					showpic2:'none',
					showpic3:'none',
                    subTitle:'',
                    contextObject:this._contextObj
                };
                
                var listLastItemWidget = new listItemWidget(listItemData);
                dojoConstruct.place(listLastItemWidget.domNode,this.wizardStepsListNode,"last");
			}
            this._setupEvents(callback);
        },
        // setting up the classname for each completed step
        _setupStylesheetClass: function(callback) {
            var liCompletedClassName = 'wizard-step-completed';            
			// create list items 
            dojoArray.forEach(this._wizardStepList,dojoLang.hitch(this,function(step,i){
				
				if(step.stepCompleted && !step.animationShowed)
				{					
					step.listItemWidget.domNode.className = liCompletedClassName;
				}                
            }));
        },
        _setupSpecEvent:function(step) {
            var domNode = step.listItemWidget.domNode;
            var clickedIndex,clickedStep;
            
            step.clickListener = this.connect(domNode, "click", dojoLang.hitch(this, function(e){
                clickedIndex = e.currentTarget.getAttribute("data-id");
                clickedStep = this._wizardStepList[clickedIndex].context;                
                
                if (this.navigationMicroflow && this.navigationMicroflow !== "") {
                    var id = clickedStep.getGuid();
                    
                    mx.data.action({
                        params          : {
                            applyto     : "selection",
                            actionname  : this.navigationMicroflow,
                            guids       : [id]
                        },
                        callback        : function(success) {
                            // if success was true, the microflow was indeed followed through
                        },
                        error           : function(error) {
                            // if there was an error
                        } 
                    }, this);
                    
                }
            }));  
			
			// setup end-event of animation to trigger completed running animation and update the attribute "AnimationShowed" to TRUE in server side.
			if(!step.animationShowed && this.showAnimationStep)
			{
				var domNodeAnchor = domNode.firstElementChild;
				if(this._percentInterval != null)
					clearInterval(this._percentInterval);
				if(domNodeAnchor.nodeName == 'A')
				{
						var constStep1CompletedAttrName = this._constStep1CompletedAttrName;
						var constAnimationShowedAttrName = this._constAnimationShowedAttrName;
						var constStep2CompletedAttrName = this._constStep2CompletedAttrName;
						var constStep3CompletedAttrName = this._constStep3CompletedAttrName;

						var constStep1AnimationShowedAttrName = this._constStep1AnimationShowedAttrName;
						var constStep2AnimationShowedAttrName = this._constStep2AnimationShowedAttrName;
						var constStep3AnimationShowedAttrName = this._constStep3AnimationShowedAttrName;					
					
		
						//var $currentActivatedStep = step.context;
						domNodeAnchor.addEventListener("webkitAnimationStart", function(){ 
									if(this._timeout != null)
										clearTimeout(this._timeout);
									if(this._percentInterval != null)
											clearInterval(this._percentInterval);
									$count = 0;
									$currentDomNodeObject = this;
									this._percentInterval = setInterval(showCounting, 1000);
						});
						domNodeAnchor.addEventListener("webkitAnimationEnd", function(){												
							if(this._percentInterval != null)
								clearInterval(this._percentInterval);
							$count = 0;			
						    $currentDomNodeObject = null;
							//$currentActivatedStep = null;
							if(step.context.has(constAnimationShowedAttrName)) {
								step.context.set(constAnimationShowedAttrName, true);
							}
							if(step.context.has(constStep1CompletedAttrName)) {
								step.context.set(constStep1CompletedAttrName, true);
							}
							if(step.context.has(constStep2CompletedAttrName)) {
								step.context.set(constStep2CompletedAttrName, true);
							}
							if(step.context.has(constStep3CompletedAttrName)) {
								step.context.set(constStep3CompletedAttrName, true);
							}	
							if(step.context.has(constStep1AnimationShowedAttrName)) {
								step.context.set(constStep1AnimationShowedAttrName, true);
							}
							if(step.context.has(constStep2AnimationShowedAttrName))	{
								step.context.set(constStep2AnimationShowedAttrName, true);
							}
							if(step.context.has(constStep3AnimationShowedAttrName))	{
								step.context.set(constStep3AnimationShowedAttrName, true);
							}	
							mx.data.commit({
										mxobj: step.context,
										callback: function() {
											console.log("Object committed");
										},
										error: function(e) {
											console.error("Could not commit object:", e);
										}
									});
							if(this.nodeName == 'A') { 
								var ulNode = this.parentNode.parentNode;
								if(ulNode != 'undefined' && ulNode.childNodes.length > 1) {									
									var nodeIndex = Array.prototype.indexOf.call(ulNode.childNodes, this.parentNode);
									if(nodeIndex == ulNode.childNodes.length - 2) {
									   // defined last step in the process. the End step will be updated to completed.
									   var lastNode = ulNode.childNodes[ulNode.childNodes.length - 1];
									   // lastNode is End-Step
									   if(lastNode != 'undefined') {
									   		//var className = lastNode.className;
											lastNode.classList.add('wizard-step-completed-without-animation');
									   }
									}
								}
							}
						});
						domNodeAnchor.addEventListener("animationstart", function(){ 
									if(this._timeout != null)
										clearTimeout(this._timeout);
									if(this._percentInterval != null)
											clearInterval(this._percentInterval);		
									$count = 0;			
									$currentDomNodeObject = this;
									this._percentInterval = setInterval(showCounting, 1000);
						});
						domNodeAnchor.addEventListener("animationend", function(){
										if(this._percentInterval != null)
											clearInterval(this._percentInterval);
										$count = 0;			
   									    $currentDomNodeObject = null;
										//$currentActivatedStep = null;
										if(step.context.has(constAnimationShowedAttrName)) {
											step.context.set(constAnimationShowedAttrName, true);
										}
										if(step.context.has(constStep1CompletedAttrName)) {
											step.context.set(constStep1CompletedAttrName, true);
										}
										if(step.context.has(constStep2CompletedAttrName)) {
											step.context.set(constStep2CompletedAttrName, true);
										}
										if(step.context.has(constStep3CompletedAttrName)) {
											step.context.set(constStep3CompletedAttrName, true);
										}	
										if(step.context.has(constStep1AnimationShowedAttrName)) {
											step.context.set(constStep1AnimationShowedAttrName, true);
										}
										if(step.context.has(constStep2AnimationShowedAttrName))	{
											step.context.set(constStep2AnimationShowedAttrName, true);
										}
										if(step.context.has(constStep3AnimationShowedAttrName))	{
											step.context.set(constStep3AnimationShowedAttrName, true);
										}
										mx.data.commit({
													mxobj: step.context,
													callback: function() {
														console.log("Object committed");
													},
													error: function(e) {
														console.error("Could not commit object:", e);
													}
												});
										if(this.nodeName == 'A') { 
										var ulNode = this.parentNode.parentNode;
										if(ulNode != 'undefined' && ulNode.childNodes.length > 1) {									
											var nodeIndex = Array.prototype.indexOf.call(ulNode.childNodes, this.parentNode);
											if(nodeIndex == ulNode.childNodes.length - 2) {
											   // defined last step in the process. the End step will be updated to completed.
											   var lastNode = ulNode.childNodes[ulNode.childNodes.length - 1];
											   // lastNode is End-Step
											   if(lastNode != 'undefined') {
													//var className = lastNode.className;
													lastNode.classList.add('wizard-step-completed-without-animation');
											   }
											}
										}
									}
						});					
				}
			}
        },
        
        // Attach events to HTML dom elements
        _setupEvents: function(callback) {
            callback();
			if(this._timeout != null)
				clearTimeout(this._timeout);			
			if(this.autoRefresh)
			{
				if($callbackObject == null)
				{
					$callbackObject = callback;					
				}
				if($widgetObject == null)
				    $widgetObject = this;					
				this._timeout = setTimeout(refreshData,this.refreshTime);
				
			}
			if(this.showAnimationStep)
			{
				try
				{
					 setTimeout(dojo.hitch(this, function() {
                            this._scrollToStep(this._lastCompletedStepIndex);
                        }), 1000);
				}
				catch(err) {

				}
			}
        },

        // Resetting the widget after getting results
        _resetWidget: function() {
            // remove the steps if present
            if (this._wizardStepList && this._wizardStepList.length > 0) {
                dojoArray.forEach(this._wizardStepList,dojoLang.hitch(this,function(step,i){
                    this.disconnect(step.clickListener);
                    step.listItemWidget.destroy();
                    step = null;
                }));
				if(this.domNode.childNodes.length > 0)
				{
					this.domNode.innerHTML = '';
				}
				
            }
			if(this._timeout != null)
				clearTimeout(this._timeout);
            this._numberOfSteps = 0;
            this._wizardStepList = [];
			$widgetObject = null;
			$callbackObject = null;
        },
		// Resetting the widget after getting results
        _scrollToStep: function(index) {
            // remove the steps if present
			 if (this._wizardStepList && this._wizardStepList.length > 0) {
				 if(this._wizardStepList[index] != undefined)
				 {
				 	var domNode = this._wizardStepList[index].listItemWidget.domNode;
				 	var containerdomNode = this.domNode;
				    	containerdomNode.scrollLeft = (containerdomNode.offsetLeft +  domNode.offsetLeft);
				 }
				}
        },
        // Reset subscriptions.
        _resetSubscriptions: function() {
            // Release handles on previous object, if any.
            this.unsubscribeAll();

            // When a mendix object exists create subscribtions. 
            if (this._contextObj) {
                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function(guid) {
                        this._resetSubscriptions();
                        this._resetWidget();
                        // add an empty function as a callback to the widget
                        this._getData( function(){} );
                    })
                });
            }
			if(this._timeout != null)
				clearTimeout(this._timeout);	
        }
    });
});
var $count = 0;
var $currentDomNodeObject = null;
var $callbackObject = null;
var $widgetObject = null;
function refreshData() {
	if($widgetObject == null)
	{
		return;
	}
	$widgetObject._getData($callbackObject);
	/*
	if($widgetObject._percentInterval == null || $widgetObject._percentInterval == 0)
		$widgetObject._getData($callbackObject);
	else
		$widgetObject._timeout = setTimeout(refreshData,$widgetObject.refreshTime);
		*/
}
function showCounting() {
	if($currentDomNodeObject == null)
	{
		return;
	}
	var $elementObjId = $currentDomNodeObject.id;
	if($elementObjId == '') return;
	if($count == 0) {
		var imgObject = document.getElementById('img-' + $elementObjId + '-1');
		if(imgObject != 'undefine')
		{
			var imgSrc = imgObject.src;
			imgSrc = imgSrc.replace("-gray", "");
			imgObject.setAttribute('src',imgSrc);				
		}
	}
	else if($count == 1) {
		var imgObject = document.getElementById('img-' + $elementObjId + '-2');
		if(imgObject != 'undefine')
		{
			var imgSrc = imgObject.src;
			imgSrc = imgSrc.replace("-gray", "");
			imgObject.setAttribute('src',imgSrc);				
		}	  
	}
	else if($count == 2) {
		var imgObject = document.getElementById('img-' + $elementObjId + '-3');
		if(imgObject != 'undefine')
		{
			var imgSrc = imgObject.src;
			imgSrc = imgSrc.replace("-gray", "");
			imgObject.setAttribute('src',imgSrc);
					
		}
	}
	else {
		
	}
	$count += 1;	
}
require(["WizardSteps/widget/WizardSteps"], function() {
    "use strict";
});
