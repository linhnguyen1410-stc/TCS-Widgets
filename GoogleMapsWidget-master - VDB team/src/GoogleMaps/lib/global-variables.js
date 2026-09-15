var glbGoogleMap;
	var directionDisplay;
	var currentObject;
	var microflowAfterLegCompleted;
  var directionsService;
  var stepDisplay;
 
  var position;
  var marker = [];
  var polyline = [];
  var poly2 = [];
  var poly = null;
  var startLocation = [];
  var endLocation = [];
  var timerHandle = [];
  var currentDistance = [];
    
  
  var speed = 0.000005, wait = 1;
  var infowindow = null;
  
  var myPano;   
  var panoClient;
  var nextPanoId;
  var lastVertex = 1;
    var stepnum=0;
    var step = 50; // 5; // metres
    var tick = 100; // milliseconds
    var eol= [];

  var Colors = ["#FF0000", "#00FF00", "#0000FF"];
	