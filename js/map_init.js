const map = L.map('map', { fullscreenControl: true }).setView([40.74281318841831, -73.92931873140857], 11);

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let boroughLayer;
let precinctLayer;
let parksLayer;
let athleticsLayer;
let parksPermitLayer;
const layerControl = L.control.layers(null, {}).addTo(map);

function searchPlace(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

  return fetch(url)
    .then(res => res.json())
    .then(results => {
      if (results.length > 0) {
        const place = results[0];
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);

        const marker = L.marker([lat, lon]).addTo(map);
        marker.bindPopup(`<strong>${place.display_name}</strong>`).openPopup();
      }
    })
}

function plotGeometry(geometry, label = '') {
  if (geometry.type === 'Point') {
    const coords = geometry.coordinates;
    const latlng = [coords[1], coords[0]];
    const marker = L.marker(latlng).addTo(map);
    marker.bindPopup(`<strong>${label}</strong>`).openPopup();
  } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    const layer = L.geoJSON(geometry, {
      style: {
        color: '#ff6600',
        weight: 2
      },
      onEachFeature: function (feature, layer) {
        layer.bindPopup(`<strong>${label}</strong>`);
      }
    }).addTo(map);
  } else {
    console.warn('Unsupported geometry type:', geometry.type);
  }
}

function getPoint(bname, pname, spname, eventName) {
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
      plotGeometry(geometry,eventName);
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
        plotGeometry(geometry, eventName);
        found = true;
        //console.log('Found in athleticsLayer');
      }
    });
  }

  //if (!found) {
  //  console.log('No match found in either layer for:', pname, spname);
  //}
}

function safeGetPoint(bname, pname, spname, eventName='') {
  if (parksPermitLayer && typeof parksPermitLayer.eachLayer === 'function') {
    getPoint(bname,pname, spname, eventName);
  } else {
    setTimeout(() => safeGetPoint(bname, pname, spname, eventName), 300);
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
    }).addTo(map);
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
    }).addTo(map);
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
    }).addTo(map);
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
    }).addTo(map);
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
    }).addTo(map);
    layerControl.addOverlay(athleticsLayer, 'Athletic Facilities');
  });

  $.getJSON('https://data.cityofnewyork.us/resource/tvpp-9vvx.json?$limit=10000', function(data) {
  console.log('Events:', data);

  let delay = 0;

  data.forEach((event, i) => {
    const location_e = event.event_location;
    const eventName = event.event_name;
    //console.log('Location', location_e);
    const boro = event.event_borough;
    if (location_e && location_e.includes(':')) {
      const location_1 = location_e.split(':')[0]
      const location_2 = location_e.split(':')[1]
      //console.log('Locations:', location_1, location_2)
      safeGetPoint(boro, location_1, location_2, eventName);
    }
  });
});