function pinSymbol(color) {
    return {
        path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#000',
        strokeWeight: 1,
        scale: 1
    };
}

function createMarker(latlng, label, html) {
// alert("createMarker("+latlng+","+label+","+html+","+color+")");
    var contentString = '<b>'+label+'</b><br>'+html;
    var marker = new google.maps.Marker({
        position: latlng,
        map: glbGoogleMap,
        title: label,
        icon: pinSymbol('green'),
        zIndex: Math.round(latlng.lat()*-100000)<<5
        });
        marker.myname = label;


    google.maps.event.addListener(marker, 'click', function() {
        infowindow.setContent(contentString); 
        infowindow.open(glbGoogleMap,marker);
        });
    return marker;
}  

 

//----------------------------------------------------------------------                
 function updatePoly(i,d) {
 // Spawn a new polyline every 20 vertices, because updating a 100-vertex poly is too slow
    if (poly2[i].getPath().getLength() > 20) {
          poly2[i]=new google.maps.Polyline([polyline[i].getPath().getAt(lastVertex-1)]);
          // map.addOverlay(poly2)
        }

    if (polyline[i].GetIndexAtDistance(d) < lastVertex+2) {
        if (poly2[i].getPath().getLength()>1) {
            poly2[i].getPath().removeAt(poly2[i].getPath().getLength()-1)
        }
            poly2[i].getPath().insertAt(poly2[i].getPath().getLength(),polyline[i].GetPointAtDistance(d));
    } else {
        poly2[i].getPath().insertAt(poly2[i].getPath().getLength(),endLocation[i].latlng);
    }
 }
//----------------------------------------------------------------------------

function animate(index,d) {
   if (d>eol[index]) {

      marker[index].setPosition(endLocation[index].latlng);
	  alert('end direction');
	  var id;
	  if(currentObject != null) {
		  id = currentObject.getGuid();
	  }
	  mx.data.action({
				params          : {
					applyto     : "selection",
					actionname  : microflowAfterLegCompleted,
					guids       : [id]
				},
				callback        : function(success) {
					// if success was true, the microflow was indeed followed through
				},
				error           : function(error) {
					// if there was an error
				} 
			}, this);
	  try {
      marker[index].setOptions({zIndex: Math.round(latlng.lat()*-100000)<<5});
	  }
	  catch(err) {
	  }
	  
      return;
   }
    var p = polyline[index].GetPointAtDistance(d);

    //map.panTo(p);
    marker[index].setPosition(p);
    marker[index].setOptions({zIndex: Math.round(p.lat()*-100000)<<5});
    updatePoly(index,d);
    timerHandle[index] = setTimeout("animate("+index+","+(d+step)+")", tick);
    currentDistance[index]=d+step;
}

//-------------------------------------------------------------------------

function startAnimation(index) {
        if (timerHandle[index]) clearTimeout(timerHandle[index]);
        eol[index]=polyline[index].Distance();
        glbGoogleMap.setCenter(polyline[index].getPath().getAt(0));

        poly2[index] = new google.maps.Polyline({path: [polyline[index].getPath().getAt(0)], strokeColor:"#FFFF00", strokeWeight:3});

        timerHandle[index] = setTimeout("animate("+index+",50)",2000);  // Allow time for the initial map display
        currentDistance[index]=50;
}

//----------------------------------------------------------------------------    
function stopAnimation(index) {
  clearTimeout(timerHandle[index]);
}

function continueAnimation(index) {
    d=currentDistance[index];
    timerHandle[index] = setTimeout("animate("+index+","+d+")", tick);
}