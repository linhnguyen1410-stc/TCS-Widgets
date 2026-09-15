/*global logger,dojo*/
/*jslint nomen: true*/
/*
    SelectionHelper
    ========================

    @file      : SelectionHelper.js
    @version   : 1.0
    @author    : Eric Tieniber
    @date      : Wed, 06 Apr 2016 16:22:55 GMT
    @copyright :
    @license   : Apache2

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
	"dojo/aspect",
	"dijit/registry"

], function(declare, _WidgetBase, aspect, registry) {
    "use strict";

    // Declare widget's prototype.
    return declare("SelectionHelper.widget.SelectionHelper", [ _WidgetBase ], {


        // Parameters configured in the Modeler.
        listenRef: "",

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _contextObj: null,
		//_guidToSelect: null,
		_runOnce: false,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function() {
            // Uncomment the following line to enable debug messages
            //logger.level(logger.DEBUG);
            logger.debug(this.id + ".constructor");
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function(obj, callback) {
            logger.debug(this.id + ".update");

			this._contextObj = obj;
			if(obj) {
				this._findAndReplaceEnsureSelection();
			}
            this._resetSubscriptions();
            callback();
		},
		
		_findAndReplaceEnsureSelection() {
			this._lv = registry.byNode(this.domNode.previousElementSibling);
			var getSelection = this._getSelectionFromReference.bind(this);

			aspect.around(this._lv, "_ensureSelection", function(origEnsure){
				return function(){
					var items = this._itemList;
					if ("singleandmaintain" === this.selectable && !this._hasSelection() && items.length) {
						var selectedGuid = getSelection();
						
						if(selectedGuid) {
							var matches = items.filter(function(item) {
								return item.getGuid() === selectedGuid;
							});
							if(matches && matches.length > 0) {
								this._addToSelection(selectedGuid);	
								matches[0].select();
							}	
						}
					}
			  	};
			});
		},

        _getSelectionFromReference: function() {
			var refGuid = this._contextObj.get(this.listenRef.split("/")[0]);
			return refGuid;
		},
		
		_fireEnsureSelection: function() {
			if(this._lv) {
				this._lv._ensureSelection();
				this._lv._shareWidgetSelection();
			}
		},

        // Reset subscriptions.
		_resetSubscriptions: function() {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            this.unsubscribeAll();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                var objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: this._fireEnsureSelection.bind(this)
                });
            }

            if (this._contextObj && this.listenRef) {
                var refHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.listenRef.split("/")[0],
                    callback: this._fireEnsureSelection.bind(this)
                });
            }
		},
		
		uninitialize: function() {
		}
    });
});

require(["SelectionHelper/widget/SelectionHelper"], function() {
    "use strict";
});
