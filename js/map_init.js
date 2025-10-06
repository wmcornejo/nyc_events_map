const map = L.map('map', { fullscreenControl: true }).setView([40.74281318841831, -73.92931873140857], 11);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let boroughLayer;
let precinctLayer;
let parksLayer;
let athleticsLayer;
let parksPermitLayer;
let events2 = [];
let eventPolygonLayer;

const layerControl = L.control.layers(null, {}).addTo(map);


function plotGeometry(geometry, event) {
  // save the geometry to the event2 using event variable
  events2.push({...event, geometry: geometry});
  /*
  if (geometry.type === 'Point') {
    const coords = geometry.coordinates;
    const latlng = [coords[1], coords[0]];
    //const marker = L.marker(latlng).addTo(map);
    marker.bindPopup(`<strong>${event.event_name}</strong>`).openPopup();
  } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    
    const layer = L.geoJSON(geometry, {
      style: {
        color: '#ff6600',
        weight: 2
      },
      onEachFeature: function (feature, layer) {
        layer.bindPopup(`<strong>${event.event_name}</strong> ${event.start_date_time}`);
      }
    }).addTo(map);
  } else {
    console.warn('Unsupported geometry type:', geometry.type);
  }*/
}

function getPoint(bname, pname, spname, event) {
  let found = false;

  if (!parksPermitLayer) {
    console.warn("parksPermitLayer not loaded yet.");
    return;
  }
  //console.log('Parks permits check')
  parksPermitLayer.eachLayer(function(layer) {
    if (found) return;

    const props = layer.feature.properties;
   //console.log('Checking park:', pname, ' to ', props.propertyname);
    //console.log('Checking subpark:', spname, ' to ', props.name);
    //console.log('To', bname, ' - ', props.bname)
  if (
    bname === props.bname &&
    props.propertyname && pname &&
    props.propertyname.trim().toLowerCase() === pname.trim().toLowerCase() &&
    props.name && spname &&
    props.name.trim().toLowerCase() === spname.trim().toLowerCase()
  ) {
      const geometry = layer.feature.geometry;
      plotGeometry(geometry,event);
      found = true;
      //console.log(' Found in parksPermitLayer');
    }
  });

  if (!found) {
    //console.log(' Not found in parksPermitLayer:', pname ,'Trying athleticsLayer...');

    if (!athleticsLayer) {
      //console.warn("athleticsLayer not loaded yet.");
      return;
    }

    athleticsLayer.eachLayer(function(layer) {
      if (found) return;

      const props = layer.feature.properties;
      if (
        bname === props.bname &&
        pname && props.eapply &&
        props.eapply.trim().toLowerCase() === pname.trim().toLowerCase() &&
        props.sub && spname &&
        props.sub.trim().toLowerCase() === spname.trim().toLowerCase()
      ) {
        const geometry = layer.feature.geometry;
        plotGeometry(geometry, event);
        found = true;
        //console.log('Found in athleticsLayer');
      }
    });
  }

  //if (!found) {
  //  console.log('No match found in either layer for:', pname, spname);
  //}
}

function safeGetPoint(bname, pname, spname, event=[]) {
  if (parksPermitLayer && typeof parksPermitLayer.eachLayer === 'function') {
    getPoint(bname,pname, spname, event);
  } else {
    setTimeout(() => safeGetPoint(bname, pname, spname, event), 300);
  }
}




fetch('data/Borough Boundaries_20250909.geojson')
  .then(res => res.json())
  .then(geojson => {
    boroughLayer = L.geoJSON(geojson, {
      style: {
        color: '#3366cc',
        weight: 2,
        fillOpacity: 0.1
      }
    });
    layerControl.addOverlay(boroughLayer, 'Borough Boundaries');
  });

  fetch('data/Police Precincts_20250909.geojson')
  .then(res => res.json())
  .then(geojson => {
    precinctLayer = L.geoJSON(geojson, {
        style: {
        color: '#cc3333',
        weight: 3,
        fillOpacity: 0.05
      }
    });
    layerControl.addOverlay(precinctLayer, 'Police Precincts');
  });
  
  fetch('data/Parks Properties_20250916.geojson')
  .then(res => res.json())
  .then(geojson => {
    parksLayer = L.geoJSON(geojson, {
      style: {
        color: '#33cc3dff',
        weight: 2
      }
    });
    layerControl.addOverlay(parksLayer, 'Parks Properties');
  });
fetch('data/Parks Permit Areas_20250923.geojson')
  .then(res => res.json())
  .then(geojson => {
    parksPermitLayer = L.geoJSON(geojson, {
      style: {
        color: '#b71bdaff',
        weight: 2
      }
    });
    layerControl.addOverlay(parksPermitLayer, 'Parks Permit Areas');
  });
fetch('data/Athletic Facilities_20250923.geojson')
  .then(res => res.json())
  .then(geojson => {
    athleticsLayer = L.geoJSON(geojson, {
      style: {
        color: '#b71bdaff',
        weight: 2
      }
    });
    layerControl.addOverlay(athleticsLayer, 'Athletic Facilities');
  });

  $.getJSON('https://data.cityofnewyork.us/resource/tvpp-9vvx.json?$limit=10000', function(data) {
  //console.log('Events:', data);
  let delay = 0;

  data.forEach((event, i) => {
    const location_e = event.event_location;
    //const eventName = event.event_name;
    //console.log('Location', location_e);
    const boro = event.event_borough;
    if (location_e && location_e.includes(':')) {
      const location_1 = location_e.split(':')[0]
      const location_2 = location_e.split(':')[1]
      //console.log('Locations:', location_1, location_2)
      safeGetPoint(boro, location_1, location_2, event);
    }
  });
  setTimeout(() => {
    // Create a FeatureCollection for all event polygons
    const eventPolygonFeatures = events2
      .filter(e => e.geometry && (e.geometry.type === 'Polygon' || e.geometry.type === 'MultiPolygon'))
      .map(e => ({
        type: "Feature",
        geometry: e.geometry,
        properties: e
      }));

    // Create a single layer for all event polygons
    const eventPolygonLayer = L.geoJSON({
      type: "FeatureCollection",
      features: eventPolygonFeatures
    }, {
      style: {
        color: '#ff6600',
        weight: 2
      },
      onEachFeature: function (feature, layer) {
        layer.bindPopup(`<strong>${feature.properties.event_name}</strong> ${feature.properties.start_date_time}`);
      }
    });
    //map.addLayer(eventPolygonLayer);
    layerControl.addOverlay(eventPolygonLayer, 'Event Polygons');
    map.addControl(new L.Control.Search({
      container: 'findbox',
      layer: eventPolygonLayer,
      propertyName: 'event_name',
      initial: false,
      collapsed: false
    }));
    
    if (eventPolygonLayer && map.hasLayer(eventPolygonLayer)) {
      map.removeLayer(eventPolygonLayer);
      console.log('About to remove');
    }
  }, 2000);


});

function applyFilters() {
    console.log('Applying filters...');

    const borough = document.getElementById('boroughSelect').value;
    const eventType = document.getElementById('eventTypeSelect').value;
    const date1 = document.getElementById('dateInput1').value;
    const date2 = document.getElementById('dateInput2').value;

    // Filter events2 based on selected filters
    const filteredFeatures = events2.filter(e => {
        let match = true;
        if (borough && e.event_borough !== borough) match = false;
        if (eventType && e.event_type !== eventType) match = false;
        if (date1 && (!e.start_date_time || !e.start_date_time.startsWith(date1))) match = false;
        // Optional: filter by end date if you want to use date2
        return match;
    }).filter(e => 
        e.geometry && (e.geometry.type === 'Polygon' || e.geometry.type === 'MultiPolygon')
    ).map(e => ({
        type: "Feature",
        geometry: e.geometry,
        properties: e
    }));

    // Remove previous filtered layer if it exists
    if (window.filteredEventLayer) {
        map.removeLayer(window.filteredEventLayer);
        layerControl.removeLayer(window.filteredEventLayer);
    }

    // Remove old search control if it exists
    if (window.eventSearchControl) {
        map.removeControl(window.eventSearchControl);
        window.eventSearchControl = null;
    }
    document.getElementById('findbox').innerHTML = '';
    // Create new filtered GeoJSON layer
    window.filteredEventLayer = L.geoJSON({
        type: "FeatureCollection",
        features: filteredFeatures
    }, {
        style: {
            color: '#ff6600',
            weight: 2
        },
        onEachFeature: function (feature, layer) {
            layer.bindPopup(`<strong>${feature.properties.event_name}</strong><br>${feature.properties.start_date_time}`);
        }
    });

    // Add the new filtered layer to map and layer control
    window.filteredEventLayer.addTo(map);
    layerControl.addOverlay(window.filteredEventLayer, 'Filtered Events');

    // Replace eventPolygonLayer with the filtered one for the search control
    eventPolygonLayer = window.filteredEventLayer;

    // Re-initialize the search control with the filtered layer
    window.eventSearchControl = new L.Control.Search({
        container: 'findbox',
        layer: eventPolygonLayer,
        propertyName: 'event_name',
        initial: false,
        collapsed: false
    });

    map.addControl(window.eventSearchControl);
}

function resetFilters() {
  document.getElementById('filterForm').reset();
  if (window.filteredEventLayer) {
    map.removeLayer(window.filteredEventLayer);
    layerControl.removeLayer(window.filteredEventLayer);
    window.filteredEventLayer = null;
  }
  if (window.eventSearchControl) {
    map.removeControl(window.eventSearchControl);
    window.eventSearchControl = null;
  }
}

console.log(events2);
/* Set the width of the side navigation to 250px and the left margin of the page content to 250px */
function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
  document.querySelector(".main").style.marginLeft = "250px";
  document.body.style.backgroundColor = "white";
}

/* Set the width of the side navigation to 0 and the left margin of the page content to 0, and the background color of body to white */
function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  document.querySelector(".main").style.marginLeft = "0";
  document.body.style.backgroundColor = "white";
}

