/*global logger, define, require*/
/*jslint nomen:true */
/*
    PrintScreen
    ========================

    @file      : PrintScreen.js
    @version   : 1.0
    @author    : Eric Tieniber
    @date      : Wed, 13 Jul 2016 19:22:54 GMT
    @copyright :
    @license   : Apache 2

    Documentation
    ========================
    Provides a "print" button that uses html2pdf to create a nice printscreen.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "PrintScreen/widget/lib/html2canvas",
    "PrintScreen/widget/lib/jspdf",
    "dojo/dom-class",
    "dojo/_base/lang",
    "dojo/query",
    "dojo/on",
    "dojo/date/locale",
    "dojo/text!PrintScreen/widget/template/PrintScreen.html"
], function(declare, _WidgetBase, _TemplatedMixin, html2canvas, JsPDF, dojoClass, dojoLang, dojoQuery, on, locale, widgetTemplate) {
    "use strict";

    // Declare widget's prototype.
    return declare("PrintScreen.widget.PrintScreenFileDoc", [_WidgetBase, _TemplatedMixin], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements
        theButton: null,

        // Parameters configured in the Modeler.
        targetClass: "",
        buttonText: "",
        orientation: null,
		imgType: null,
        onChangeMF: null,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        myHtml2canvas: null,
        _contextObj: null,

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function() {
            console.log(this.id + ".postCreate");

            this.theButton.innerHTML = this.buttonText;
            this.theButton.setAttribute("disabled", "true");
            this.connect(this.theButton, "click", dojoLang.hitch(this, this.createPrintscreen));
        },
        update: function (obj, callback) {
            console.log(this.id + "._update");
            this.theButton.removeAttribute("disabled");
            this._contextObj = obj;		
            callback();
        },

        createPrintscreen: function() {
            var widgetNode = dojoQuery("." + this.targetClass)[0],
                self = this;

			var backgroundClr = '#fff';
			if(this.imgType === "png") {
				backgroundClr = "transparent";
			}

			var imgType = this.imgType;
            
            if(this._contextObj && widgetNode)
            {
                //dojoClass.toggle("fixedWidth");
                var pid = mx.ui.showProgress(null, true);
                html2canvas(widgetNode, {
                    background: backgroundClr,
                    onrendered: function(canvas) {
                        var strFileName2Save = self.Filename2Save(self.targetClass),
                            doc;

                        if (self.orientation === "portrait") {
                            doc = new JsPDF("p", "pt", "letter", true);
                        } else {
                            doc = new JsPDF("l", "pt", "letter", true);
                        }


                        var pageWidth, pageHeight;

                        if (self.orientation === "portrait") {
                            pageWidth = 612;
                            pageHeight = 792;
                        } else {
                            pageWidth = 792;
                            pageHeight = 612;
                        }

                        //each page should be this number of pixels tall
                        var imgPageHeight = canvas.width * pageHeight / pageWidth;
                        var heightLeft = canvas.height;

                        var pageCanvas,
                            context,
                            pageImgData,
                            pageCount = 0;

                        while (heightLeft >= 0) {

                            if(pageCount !== 0) {
                                doc.addPage();
                            }

                            pageCanvas = document.createElement('canvas');
                            pageCanvas.width = canvas.width;
                            pageCanvas.height = imgPageHeight;
                            context = pageCanvas.getContext('2d');

                            if (imgType === 'jpeg') {
                                context.fillStyle = '#fff';  /// set white fill style
                                context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                            }

                            context.drawImage(canvas, 0, canvas.height-heightLeft, canvas.width,  imgPageHeight, 0, 0, pageCanvas.width, pageCanvas.height);

                            if (imgType === 'png') {
                                pageImgData = pageCanvas.toDataURL('image/png');
                                doc.addImage(pageImgData, 'PNG', 0, 0, pageWidth, pageHeight, pageCount, 'FAST');
                            } else {
                                pageImgData = pageCanvas.toDataURL('image/jpeg', 1.0);
                                doc.addImage(pageImgData, 'JPEG', 0, 0, pageWidth, pageHeight, pageCount, 'FAST');
                            }

                            heightLeft -= imgPageHeight;
                            pageCount += 1;
                        }

                        var file = doc.output('blob');
                        console.debug(self.id + " set context object with blob");
                        mx.data.saveDocument(self._contextObj.getGuid(), strFileName2Save, {}, file, 
                            dojoLang.hitch(self,function() {
                                console.debug("File "+strFileName2Save+" has stored in object: " + self._contextObj.getGuid());
                                mx.data.commit({
                                    mxobj: self._contextObj,
                                    callback: function() {
                                        console.debug("Object committed");
                                        if(self.onChangeMF){
                                            mx.data.action({
                                                params: {
                                                    actionname: self.onChangeMF,
                                                    applyto: "selection",
                                                    guids: [self._contextObj.getGuid()]
                                                },
                                                origin: self.mxform,
                                                callback: function(obj) {
                                                    mx.ui.hideProgress(pid);
                                                    console.debug("Onchange triggered for "+strFileName2Save+" and id: " + self._contextObj.getGuid());
                                                },
                                                error: function(error) {
                                                    alert(error.description);
                                                }
                                            });
                                        }
                                    },
                                    error: function(e) {
                                        console.log("Error occurred attempting to commit: " + e);
                                        mx.ui.hideProgress(pid);
                                    }
                                });
                            }), dojoLang.hitch(self,function(e) {
                                console.error(e);
                                mx.ui.hideProgress(pid);
                            })           
                        ); 
                    },
                    height: widgetNode.scrollHeight
                });
            } else {
                alert("The screen shot can't be made because there isn't an object to store the image.");
            } 
        },

        msieversion: function() {
            var ua = window.navigator.userAgent,
                msie = ua.indexOf("MSIE ");

            if (msie > 0) { // If Internet Explorer, return version number
                return parseInt(ua.substring(msie + 5, ua.indexOf(".", msie)), 10);
            } else { // If another browser, return 0
                return 0;
            }
        },

        Filename2Save: function(Class2Print) {
            var milsecDateNow = Date.now(),
                dateDateNow = new Date(milsecDateNow),
                options = {
                    selector: "date",
                    datePattern: "yyyy-MM-dd"
                },
                strDate = locale.format(dateDateNow, options),
                // strTime = formatDate(dateDateNow, "hh:mm" );

                strFileName2Save = this.fileNamePrefix + " " + strDate + ".pdf";
            return strFileName2Save;
        }
    });
});

require(["PrintScreen/widget/PrintScreenFileDoc"]);
