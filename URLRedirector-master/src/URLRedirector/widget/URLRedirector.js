/*jslint white:true, nomen: true, plusplus: true */
/*global mx, mxui, define, require, browser, devel, console, document, jQuery, window */
/*mendix */
/*
    HelpText
    ========================

    @file      : URLRedirector.js
    @version   : 1.2
    @author    : Gerhard Richard Edens
    @date      : Tue, 03 Jun 2015 11:19:00 GMT
    @copyright : Mendix bv
    @license   : Apache 2

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare", "mxui/widget/_WidgetBase"
], function (declare, _WidgetBase) {
    "use strict";

    // Declare widget"s prototype.
    return declare("URLRedirector.widget.URLRedirector", [_WidgetBase], {

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handle: null,
        _handles: null,
        _contextObj: null,
        _alertDiv: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            console.log(this.id + ".postCreate");
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            console.log(this.id + ".update");

            this._contextObj = obj;
            if (this._contextObj !== null) {
                this._updateRendering(callback);
            } else {
                callback();
            }
        },

        applyContext: function(obj, callback) {
            if (obj !== null) {
                mx.data.get({
                    guids    : [obj.getTrackId()],
                    callback : function(objs) {
                        if (objs.length === 1) {
                            this._contextObj = objs[0];
                            this._updateRendering(callback);
                        }
                    }
                }, this);
            } else {
                callback();
            }
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {},

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {},

        // mxui.widget._WidgetBase.resize is called when the page"s layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {},

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize : function() {
        },

        // Rerender the interface.
        _updateRendering: function (callback) {
            var url = null;
            try {
                if (this.URLAttribute !== "" || this.urlprefix !== "")
                {
                    if(this.URLAttribute !=="") {
                        url = this.urlprefix + this._contextObj.get(this.URLAttribute);
                    } else {
                        url = this.urlprefix;
                    }
                    this._redirectTo(url, callback);
                } else {
                    console.warning("At least prefix property or either URLAttribute property should be configured in widget property configuration");
                    callback();
                }
            }
            catch (err) {
                console.error(this.id +"_updateRendering: " + err);
                callback();
            }
        },

        _redirectTo : function(url, callback) {
            callback();
            if(this.Target === "Page")
            {
                window.location.replace(url);
            }
            else
            {
                window.open(url);
            }
        }
    });
});
require(["URLRedirector/widget/URLRedirector"], function () {
    "use strict";
});

