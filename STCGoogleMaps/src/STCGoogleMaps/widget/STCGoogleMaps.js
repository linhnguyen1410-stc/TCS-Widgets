/*

    GoogleMaps STC Custom
    ========================

    @file      : googlemaps.js
    @version   : 1.0.2
    @author    : Linh Nguyen
    @date      : 10-3-2020
    @copyright : STC Group@2021
    @license   : Apache v2

    Documentation
    ========================
    This is an extension to the default Mendix Google Maps widget, based on version 6.0.1 of the AppStore. Extra features are: toggling between drag and drop mode, markerclustering for multiple markers and customizing the infowindow and marker.
	
	Also changed is the way the markers are being fetched from the database. This version works better with large amounts of markers, because it is not calling a recursive function as is done in the default Google Maps widget, resulting in 'exceeding stack-size' errors.
	
	Releases
	========================
	v1.0 	Initial release.
	v1.1 	Mendix 7 fix for dom.input not being supported in Client API anymore. Now supported via html template.
			Added formatted address functionality when dragging a marker
			Fix for retrieving objects from DB. Was sometimes triggered twice
			Fix for widget sometimes not working when object not committed yet
			Added options 'Start Draggable' and 'Hide Toggle Dragging'	
	*/

    define([
        "dojo/_base/declare",
        "mxui/widget/_WidgetBase",
        "dijit/_TemplatedMixin",
        "dojo/dom-style",
        "dojo/dom-construct",
        "dojo/_base/array",
        "dojo/_base/lang",
        "dojo/text!STCGoogleMaps/widget/template/STCGoogleMaps.html",
      //  "STCGoogleMaps/lib/jsapi"
    ], function (declare, _WidgetBase, _TemplatedMixin, domStyle, domConstruct, dojoArray, lang, widgetTemplate) {
        "use strict";
    
        return declare("STCGoogleMaps.widget.STCGoogleMaps", [_WidgetBase, _TemplatedMixin], {
            templateString: widgetTemplate,
    
            _handle: null,
            _contextObj: null,
            _googleMap: null,
            _markerCache: null,
            _googleScript: null,
            _defaultPosition: null,           
            _progressID: null,
    
            _latlngObjs: [],
            _resizeTimer: null,
            _loaded: true,
                
            // Internal variables. Non-primitives created in the prototype are shared between all widget instances.   

            // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
             constructor () {                
                logger.debug(this.id + ".constructor");                           
                this._handles = [];
            },

            postCreate () {
                logger.debug(this.id + ".postCreate");                                      
            },  
            async _GetAPIKey(){
                //Already
                if(document.getElementById('googleAPIscriptId'))  return;
                if(!this.apiAccessKey && this.apiAccessKeyMfl){              
                    let api = await this._LoadAPIFromMicroflow(this.apiAccessKeyMfl);                    
                    if(api) {
                        this.apiAccessKey = api;
                    }
                }
                if(this.apiAccessKey){
                    var s = document.createElement("script");
                    s.id ="googleAPIscriptId";
                    s.type = "text/javascript";
                    s.src = "https://maps.google.com/maps/api/js?key=" +   this.apiAccessKey ;
                    s.async = false;
                    s.defer = false;
                    document.head.appendChild(s);   
                    await new Promise(resolve => setTimeout(resolve, 1500));                      
                    this._LoadExternalJsFiles(this.externalJsFiles);
                 
                } else  console.warn("Google JSAPI Key is not loaded!");
            },            
            _LoadAPIFromMicroflow(microflow){ 
                return new Promise((resolve, reject) =>{               
                mx.data.action({
                    params: {                  
                        actionname: microflow                 
                    },
                    store: {
                        caller: this.mxform
                    },
                    callback: resolve,
                    error: function (error) {
                        console.debug(error.description);
                        reject(error);
                    }
                }, this);
                });
            },
            _LoadExternalJsFiles(files){
                var head = document.getElementsByTagName('head')[0];
                files.forEach(file=>{
                    var script = document.createElement('script');
                    script.src = file.fileSource;
                    script.type = 'text/javascript';
                    head.appendChild(script)
                });
            },
            async update(obj, callback) {
                this._contextObj = obj;              
                await this._GetAPIKey();
                if(this.apiAccessKey)
                    await new Promise(resolve => setTimeout(resolve, 1500));                      
                if(obj != null)
                {	
                    currentObject = obj;
                    // a microflow will be called after route animation finished
                    microflowAfterLegCompleted = this.actionMicroflow;
                    // during animation playing, a microflow will be called to update the step distance to database.
                    microflowUpdateLegDriving = this.microflowUpdateLegStep;
                    nanoflowCheckRouteCallback = this.nanoflowCheckRoute;		
                }
                
                this._resetSubscriptions();
                if (google == undefined) {
                    console.warn("Google JSAPI is not loaded, exiting!");
                    this._loaded = false;
                    callback();
                    return;
                }
                if (!google) {
                    console.warn("Google JSAPI is not loaded, exiting!");
                    this._loaded = false;
                    callback();
                    return;
                }
              
                if (!google.maps) {
                    var params = (this.apiAccessKey !== "") ? "key=" + this.apiAccessKey : "";
                    if (google.loader && google.loader.Secure === false) {
                        google.loader.Secure = true;
                    }
                    window._googleMapsLoading = true;
                    google.load("maps", 3, {
                        other_params: params,
                        callback: lang.hitch(this, function () {
                            window._googleMapsLoading = false;
                            this._loadMap(callback);
                        })
                    });
                } else {
                    if (this._googleMap) {
                        this._fetchMarkers(callback);
                        google.maps.event.trigger(this._googleMap, "resize");
                    } else {
                        if (window._googleMapsLoading) {
                            this._waitForGoogleLoad(callback);
                        } else {
                            this._loadMap(callback);
                        }
                    }
                }
            },
    
            resize: function (box) {
                if (this._googleMap) {
                    if (this._resizeTimer) {
                        clearTimeout(this._resizeTimer);
                    }
                    this._resizeTimer = setTimeout(lang.hitch(this, function () {
                        google.maps.event.trigger(this._googleMap, "resize");
                        if (this.gotocontext) {
                            this._goToContext();
                        }
                    }), 250);
                }
            },
    
            _waitForGoogleLoad: function (callback) {
                var interval = null,
                    i = 0,
                    timeout = 5000; // We'll timeout if google maps is not loaded
                var intervalFunc = lang.hitch(this, function () {
                    i++;
                    if (i > timeout) {
                        logger.warn(this.id + "._waitForGoogleLoad: it seems Google Maps is not loaded in the other widget. Quitting");
                        this._loaded = false;
                        this._executeCallback(callback);
                        clearInterval(interval);
                    }
                    if (!window._googleMapsLoading) {
                        this._loaded = true;
                        this._loadMap(callback);
                        clearInterval(interval);
                    }
                });
                interval = setInterval(intervalFunc, 1);
            },
    
            _resetSubscriptions: function () {
    
                if (this._handle) {
                    logger.debug(this.id + "._resetSubscriptions unsubscribe");
                    mx.data.unsubscribe(this._handle);
                    this._handle = null;
                }
    
                if (this._contextObj) {
                    logger.debug(this.id + "._resetSubscriptions subscribe", this._contextObj.getGuid());
                    this._handle = mx.data.subscribe({
                        guid: this._contextObj.getGuid(),
                        callback: lang.hitch(this, function (guid) {
                            this._fetchMarkers();
                        })
                    });
                }
                else {
                    this._handle = mx.data.subscribe({
                        entity: this.mapEntity,
                        callback: lang.hitch(this, function (entity) {
                            this._fetchMarkers();
                        })
                    });
    
                }
            },
    
            _loadMap: function (callback) {
                domStyle.set(this.mapContainer, {
                    height: this.mapHeight + "px",
                    width: this.mapWidth
                });
    
                this._defaultPosition = new google.maps.LatLng(this.defaultLat, this.defaultLng);
    
                var mapOptions = {
                    zoom: 11,
                    draggable: this.opt_drag,
                    scrollwheel: this.opt_scroll,
                    center: this._defaultPosition,
                    mapTypeId: google.maps.MapTypeId[this.defaultMapType] || google.maps.MapTypeId.ROADMAP,
                    mapTypeControl: this.opt_mapcontrol,
                    mapTypeControlOption: {
                        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR
                    },
                    streetViewControl: this.opt_streetview,
                    zoomControl: this.opt_zoomcontrol,
                    noClear:true,
                    gestureHandling: this.gestureHandling,
                    tilt: parseInt(this.opt_tilt.replace("d", ""), 10)
                };
                if (this.styleArray !== ""){
                    mapOptions.styles = JSON.parse(this.styleArray);
                }
             
                this._googleMap = new google.maps.Map(this.mapContainer, mapOptions);
    //			if(this._contextObj != null)
                glbGoogleMap = this._googleMap;
                this._fetchMarkers();
    
                this._executeCallback(callback);
            },
    
            _fetchMarkers: function (callback) {
                logger.debug(this.id + "._fetchMarkers");
                if (this.gotocontext) {
                    this._goToContext(callback);
                } else {
                    if (this.updateRefresh) {
                        this._fetchFromDB(callback);
                    } else {
                        if (this._markerCache) {
                            this._fetchFromCache(callback);
                        } else {
                            this._fetchFromDB(callback);
                        }
                    }
                }
            },
    
            _refreshMap: function (objs, callback) {
                logger.debug(this.id + "._refreshMap");
                var request = {
                    travelMode: google.maps.TravelMode.DRIVING				
                  };
                var _directionsDisplay = new google.maps.DirectionsRenderer({
                          suppressMarkers: true,
                          preserveViewport: true
                      });
                
                _directionsDisplay.setMap(this._googleMap);
                var infowindow = new google.maps.InfoWindow();
                var bounds = new google.maps.LatLngBounds(),
                    panPosition = this._defaultPosition,
                    validCount = 0;
    
                if (this.showProgress) {
                    this._progressID = mx.ui.showProgress(this.progressMessage);
                }
                 
                
                this._createLatLngObjs(objs, [], lang.hitch(this, function (latlngObjs) {
    
                    if (this._progressID) {
                        mx.ui.hideProgress(this._progressID);
                        this._progressID = null;
                    }
    
                    this._latlngObjs = latlngObjs;
                    dojoArray.forEach(this._latlngObjs, lang.hitch(this, function (obj) {
                        //custom with market
                        var marker = this._addMarker(obj,validCount);
                        
                        var position = this._getLatLng(obj);
                        if (position) {
                            bounds.extend(position);
                          
    
                            /* custom to draw direction */
                             //Shows marker names and related content
                              const contentString =
                                '<div id="content">' +
                                '<div id="siteNotice">' +
                                "</div>" +
                                '<h1 id="firstHeading" class="firstHeading">'+marker.title+'</h1>' +
                                '<div id="bodyContent">' +
                                "<p><b>Uluru</b>, also referred to as <b>Ayers Rock</b>, is a large " +
                                "sandstone rock formation in the southern part of the " +
                                "Northern Territory, central Australia. It lies 335&#160;km (208&#160;mi) " +
                                "south west of the nearest large town, Alice Springs; 450&#160;km " +
                                "(280&#160;mi) by road. Kata Tjuta and Uluru are the two major " +
                                "features of the Uluru - Kata Tjuta National Park. Uluru is " +
                                "sacred to the Pitjantjatjara and Yankunytjatjara, the " +
                                "Aboriginal people of the area. It has many springs, waterholes, " +
                                "rock caves and ancient paintings. Uluru is listed as a World " +
                                "Heritage Site.</p>" +
                                '<p>Attribution: Uluru, <a href="https://en.wikipedia.org/w/index.php?title=Uluru&oldid=297882194">' +
                                "https://en.wikipedia.org/w/index.php?title=Uluru</a> " +
                                "(last visited June 22, 2009).</p>" +
                                "</div>" +
                                "</div>";
                            google.maps.event.addListener(marker, 'click', (function(marker, validCount) {
                              return function() {
                                infowindow.setContent(contentString);
                                infowindow.open(this._googleMap, marker);
                              }
                            })(marker, validCount));
                            
                            if (validCount == 0) request.origin = marker.getPosition();
                            else if (validCount == this._latlngObjs.length - 1) request.destination = marker.getPosition();
                            else {
                              if (!request.waypoints) request.waypoints = [];
                              request.waypoints.push({
                                location: marker.getPosition(),
                                stopover: true,
                              });
                            }						  
                              /* end custom to draw direction */
                              
                               validCount++;
                            panPosition = position;
                              
                        } else {
                            logger.error(this.id + ": " + "Incorrect coordinates (" + this.checkAttrForDecimal(obj, this.latAttr) +
                                          "," + this.checkAttrForDecimal(obj, this.lngAttr) + ")");
                        }
                    }));
    
                    if (validCount < 2) {
                        this._googleMap.setZoom(this.lowestZoom);
                        this._googleMap.panTo(panPosition);
                    } else {
                       this._googleMap.fitBounds(bounds);
                    }
                    // conditionally add a line between the markers baded on Modeler setting
                    
                    if (this.showLines) {
                        var directionsService = new google.maps.DirectionsService();								 
                            directionsService.route(request, function(response, status) {
                              if (status == google.maps.DirectionsStatus.OK) {									
                                    _directionsDisplay.setDirections(response);									
                                
                              } else {
                                //alert("Directions Request from " + start.toUrlValue(6) + " to " + end.toUrlValue(6) + " failed: " + status);
                              }
                            });
                        
                    }			
                    
                                
                    this._executeCallback(callback);
                }));
    //			
            },
    
            _createLatLngObjs: function (objs, latlngs, callback) {
                // _createLatLngObjs is a recursive function. It tries to get the lat en lng of an object and passes the list of objects (minus the first) to itself
                logger.debug(this.id + "._createLatLngObjs: todo:" + objs.length + "/done:" + latlngs.length);
                if (objs.length === 0) {
                    callback(latlngs);
                } else {
                    var obj = objs.pop(),
                        latlngObj = {
                            mxObj: obj
                        };
    
                    obj.fetch(this.latAttr, lang.hitch(this, function (lat) { // We do a fetch so we can get attributes over association
                        if (lat === null || lat === "") {
                            this._createLatLngObjs(objs, latlngs, callback);
                        } else {
                            if (typeof lat === "object") { // Big
                                lat = lat.toString();
                            }
                            latlngObj.lat = parseFloat(lat);
                            obj.fetch(this.lngAttr, lang.hitch(this, function (lng) {
                                if (lng === null || lng === "") {
                                    this._createLatLngObjs(objs, latlngs, callback);
                                } else {
                                    if (typeof lat === "object") { // Big
                                        lat = lat.toString();
                                    }
                                    latlngObj.lng = parseFloat(lng);
    
                                    latlngs.push(latlngObj);
                                    this._createLatLngObjs(objs, latlngs, callback);
                                }
                                
                            }));
                            
                        }
                    }));
                }
            },		
            _fetchFromDB: function (callback) {
                logger.debug(this.id + "._fetchFromDB");
                var xpath = "//" + this.mapEntity + this.xpathConstraint;
    
                this._removeAllMarkers();
                 if (this.datasourceMfl && this.datasourceMfl !== "") {
                     if(this._contextObj != null)
                     {
                         var id = this._contextObj.getGuid();
                            
                            mx.data.action({
                                params          : {
                                    applyto     : "selection",
                                    actionname  : this.datasourceMfl,
                                    guids       : [id]
                                },
                                callback: lang.hitch(this, function (objs) {
                                    this._refreshMap(objs, callback);
                                }),
                                error           : function(error) {
                                    // if there was an error
                                } 
                            }, this);	
                     }
                 }
                 else if (this._contextObj) {
                    xpath = xpath.replace(/\[%CurrentObject%\]/g, this._contextObj.getGuid());
                    mx.data.get({
                        xpath: xpath,
                        callback: lang.hitch(this, function (objs) {
                            this._refreshMap(objs, callback);
                        })
                    });
                } else if (!this._contextObj && (xpath.indexOf("[%CurrentObject%]") > -1)) {
                    console.warn("No context for xpath, not fetching.");
                    this._executeCallback(callback);
                } else {
                    mx.data.get({
                        xpath: xpath,
                        callback: lang.hitch(this, function (objs) {
                            this._refreshMap(objs, callback);
                        })
                    });
                }
            },
    
            _fetchFromCache: function (callback) {
                logger.debug(this.id + "._fetchFromCache");
                var cached = false,
                    bounds = new google.maps.LatLngBounds();
    
                this._removeAllMarkers();
    
                dojoArray.forEach(this._markerCache, lang.hitch(this, function (marker, index) {
                    if (this._contextObj) {
                        if (marker.id === this._contextObj.getGuid()) {
                            marker.setMap(this._googleMap);
                            bounds.extend(marker.position);
                            cached = true;
                        }
                    } else {
                        marker.setMap(this._googleMap);
                    }
                    if (index === this._markerCache.length - 1) {
                        this._googleMap.fitBounds(bounds);
                    }
                }));
    
                if (!cached) {
                    this._fetchFromDB(callback);
                } else {
                    this._executeCallback(callback);
                }
            },
    
            _removeAllMarkers: function () {
                logger.debug(this.id + "._removeAllMarkers");
                if (this._markerCache) {
                    dojoArray.forEach(this._markerCache, function (marker) {
                        marker.setMap(null);
                    });
                }
            },
    
            _addMarker: function (obj,indexObj) {
                logger.debug(this.id + "._addMarker");
                var id = this._contextObj ? this._contextObj.getGuid() : null,
                    marker = null,
                    lat = obj.lat,
                    lng = obj.lng,
                    markerImageURL = null,
                    url = null;
                
                marker = new google.maps.Marker({
                   // position: addressString != '' ? this._addressToLocation(addressString) : new google.maps.LatLng(lat, lng),
                    position: new google.maps.LatLng(lat, lng),
                    map: this._googleMap
                });
    
                if (id) {
                    marker.id = id;
                }
    
                if (this.markerDisplayAttr) {
                    obj.mxObj.fetch(this.markerDisplayAttr, function (value) {
                        marker.setTitle(value);
                    });
                }
                var color = 'red';
                if(this.colorAttr != null && this.colorAttr != 'undefined')
                {
                        obj.mxObj.fetch(this.colorAttr, function (value) {
                            color = value;
                        });
                }
                if (this.markerImages.length > 1 && this.enumAttr) {
                    obj.mxObj.fetch(this.enumAttr, lang.hitch(this, function (enumeration) {
                        if (enumeration) {
                            dojoArray.forEach(this.markerImages, lang.hitch(this, function (imageObj) {
                                if (imageObj.enumKey === enumeration) {
                                    marker.setIcon(window.mx.appUrl +  imageObj.enumImage);
                                }
                            }));
                        }
                    }));
                } else if (this.defaultIcon) {
                    marker.setIcon(window.mx.appUrl +  this.defaultIcon);
                }
                else {
                    markerImageURL = this.pinSymbol(color,indexObj);
                    marker.setIcon(markerImageURL);
                }
                
    
                if (!this._markerCache) {
                    this._markerCache = [];
                }
    
                if (this.onClickMarkerMicroflow) {
                    marker.addListener("click", lang.hitch(this, function () {
                        this._execMf(this.onClickMarkerMicroflow, obj.mxObj.getGuid());
                    }));
                }
    
                if (dojoArray.indexOf(this._markerCache, marker) === -1) {
                    this._markerCache.push(marker);
                }
                return marker;
            },
            pinSymbol : function(color,indexLabel) {
            
                var pathSymbol;
                var symbolScale;
                var symbolOpt;		
                
                symbolOpt = {
                    path:
                      "M10.453 14.016l6.563-6.609-1.406-1.406-5.156 5.203-2.063-2.109-1.406 1.406zM12 2.016q2.906 0 4.945 2.039t2.039 4.945q0 1.453-0.727 3.328t-1.758 3.516-2.039 3.070-1.711 2.273l-0.75 0.797q-0.281-0.328-0.75-0.867t-1.688-2.156-2.133-3.141-1.664-3.445-0.75-3.375q0-2.906 2.039-4.945t4.945-2.039z",
                    fillColor: color,
                    fillOpacity: 1,
                    strokeWeight: 0,
                    rotation: 0,
                    scale: 2,
                    anchor: new google.maps.Point(15, 20)
                };
                /*
                //width label index
                symbolOpt = {				
                    fillColor: color,
                    fillOpacity: 1,
                    strokeWeight: 0,
                    rotation: 0,
                    label: indexLabel,
                    scale: 2,
                    anchor: new google.maps.Point(15, 20)
                };
                */
                return symbolOpt;
            },
            _getLatLng: function (obj) {
                logger.debug(this.id + "._getLatLng");
                var lat = obj.lat,
                    lng = obj.lng;
    
                if (lat === "" && lng === "") {
                    return this._defaultPosition;
                } else if (!isNaN(lat) && !isNaN(lng) && lat !== "" && lng !== "") {
                    return new google.maps.LatLng(lat, lng);
                } else {
                    return null;
                }
            },
             _addressToLocation: function (address) {
                logger.debug(this.id + "._addressToLocation");
                var geocoder = new google.maps.Geocoder();
                geocoder.geocode(
                {
                    address: address
                }, 
                function(results, status) {				
                    if(status == google.maps.GeocoderStatus.OK) {
                        if(results) {
                            var numOfResults = results.length;
                            if(numOfResults > 0) {
                                return (results[0].geometry.location);
                            }
                        } else {
                            return null;
                        }
                    }
                });
            },
            _goToContext: function (callback) {
                logger.debug(this.id + "._goToContext");
                this._removeAllMarkers();
                if (this._googleMap && this._contextObj) {
                    this._refreshMap([ this._contextObj ], callback);
                } else {
                    this._executeCallback(callback);
                }
            },
    
            _execMf: function (mf, guid, cb) {
                logger.debug(this.id + "._execMf");
                if (mf && guid) {
                    mx.data.action({
                        params: {
                            applyto: "selection",
                            actionname: mf,
                            guids: [guid]
                        },
                        store: {
                            caller: this.mxform
                        },
                        callback: lang.hitch(this, function (obj) {
                            if (cb && typeof cb === "function") {
                                cb(obj);
                            }
                        }),
                        error: function (error) {
                            console.debug(error.description);
                        }
                    }, this);
                }
            },
    
            _executeCallback: function (cb) {
               if (cb && typeof cb === "function") {
                    cb();
                }
                if(google == undefined) return;
                //map is loaded and start to check route option.
                if(this._loaded) {				
                    if(this.checkRoute && this._contextObj != null) {
                        var nanoflowCheckRouteByLeg = this.nanoflowCheckRoute;
                        if(nanoflowCheckRouteByLeg == 'undefined' || nanoflowCheckRouteByLeg == '')
                        {
                            nanoflowCheckRouteByLeg = nanoflowCheckRouteCallback;
                        }
                        if(nanoflowCheckRouteByLeg != '' && nanoflowCheckRouteByLeg != 'undefined')
                        {
                            mx.data.callNanoflow({
                                nanoflow: nanoflowCheckRouteByLeg,
                                orgin: this.mxform,
                                context:this.mxcontext,
                                callback: function(result) {
                                    logger.debug("googlemap._executeCallback.successed");
                                },
                                error: function(error) {
                                    logger.debug("googlemap._executeCallback.failed: " + error.message);
                                }
                            });
                        }
                    }
                }
                
            }
        });
    });
require(["STCGoogleMaps/widget/STCGoogleMaps"]);
