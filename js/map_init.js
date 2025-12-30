const map = L.map('map', { fullscreenControl: true }).setView([40.74281318841831, -73.92931873140857], 11);
const GOAT_API_BASE = 'https://geoservice.planning.nyc.gov/geoservice/geoservice.svc/Function_3'; 
const GOAT_API_KEY = '3s6v9y6BkEAHkMbQ';
let geojsonFeatures = [];
const boroughCode = {
  "MANHATTAN": "1",
  "BRONX": "2",
  "BROOKLYN": "3",
  "QUEENS": "4",
  "STATEN ISLAND": "5"
};

const osm = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 20
}).addTo(map);


let boroughLayer;
let precinctLayer;
let parksLayer;
let athleticsLayer;
let parksPermitLayer;
let events2 = [];
let eventPolygonLayer;
// eventtypes will hold unique event types for the filter dropdown
let eventtypes = [];

const layerControl = L.control.layers(null, {}).addTo(map);

function segmentToGeoJSON(display, event) {
  // return geojson version of segment
  const fromLat = parseFloat(display.out_from_latitude);
  const fromLon = parseFloat(display.out_from_longitude);
  const toLat = parseFloat(display.out_to_latitude);
  const toLon = parseFloat(display.out_to_longitude);
  //console.log('fromLat:', fromLat, 'fromLon:', fromLon, 'toLat:', toLat, 'toLon:', toLon);
  if (isNaN(fromLat) || isNaN(fromLon) || isNaN(toLat) || isNaN(toLon)) {
    throw new Error("Invalid coordinates in segment data");
  }
  events2.push({...event,geometry: {
      type: "LineString",
      coordinates: [
        [fromLon, fromLat],
        [toLon, toLat]
      ]
    }});
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [fromLon, fromLat],
        [toLon, toLat]
      ]
    },
    properties: {
      segment_id: display.out_segment_id?.trim(),
      street: display.out_stname1?.trim(),
      from: display.out_stname2?.trim(),
      to: display.out_stname3?.trim(),
      borough: display.out_boro_name1?.trim(),
      length_feet: Number(display.out_segment_len),
      speed_limit: Number(display.out_speed_limit),
      bike_lane: display.out_bike_lane?.trim(),
      traffic_direction: display.out_traffic_direction?.trim()
    }
  };
}
function parseLocation(locationStr) {
  const match = locationStr.match(/^(.+?)\s+between\s+(.+?)\s+and\s+(.+)$/i);
  if (!match) return null;
  let [, onStreet, fromStreet, toStreet] = match.map(s => s.trim());
  return { onStreet, fromStreet, toStreet };
}
// Call GOAT Function 3 API
async function fetchSegmentFromGOAT(onStreet, fromStreet, toStreet, borough) {
  const boroughCodeStr = boroughCode[borough.toUpperCase()] || "1";

  const params = new URLSearchParams({
    Borough1: boroughCodeStr,
    OnStreet: onStreet,
    Borough2: boroughCodeStr,
    FirstCrossStreet: fromStreet,
    Borough3: boroughCodeStr,
    SecondCrossStreet: toStreet,
    DisplayFormat: "JSON",
    Key: GOAT_API_KEY
  });
  const url = `${GOAT_API_BASE}?${params.toString()}`;

  console.log('GOAT API URL:', url);
  const response = await fetch(url);
  //console.log('response:', response);
  const data = await response.json();
  console.log('data in fetch:', data.display);
  return data;
}
function getPoint(bname, pname, spname, event) {
  let found = false;

  if (!parksPermitLayer) {
    //console.warn("parksPermitLayer not loaded yet.");
    return;
  }
  //console.log('Parks permits check')
  parksPermitLayer.eachLayer(function(layer) {
    if (found) return;

    const props = layer.feature.properties;
  if (
    bname === props.bname &&
    props.propertyname && pname &&
    props.propertyname.trim().toLowerCase() === pname.trim().toLowerCase() &&
    props.name && spname &&
    props.name.trim().toLowerCase() === spname.trim().toLowerCase()
  ) {
      const geometry = layer.feature.geometry;
      events2.push({...event, geometry: geometry});
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
        events2.push({...event, geometry: geometry});
        found = true;
        //console.log('Found in athleticsLayer');
      }
    });
  }
}

function updateProgressBar(percentage) {
  const progressBar = document.querySelector('.progress-bar');
  progressBar.style.width = `${percentage}%`;
}

function safeGetPoint(bname, pname, spname, event=[]) {
  if (parksPermitLayer && typeof parksPermitLayer.eachLayer === 'function') {
    getPoint(bname,pname, spname, event);
  } else {
    setTimeout(() => safeGetPoint(bname, pname, spname, event), 300);
  }
}

// get geojson layers
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

// get event data from api
 (async function() {
  $.getJSON(
    'https://data.cityofnewyork.us/resource/tvpp-9vvx.json?$limit=15000',
    async function (data) { // <-- make this async
      let delay = 0;
      console.log('Total events;', data.length);
      for (const event of data) {
        console.log('Percent complete:', ((data.indexOf(event) + 1) / data.length * 100).toFixed(2) + '%');
        updateProgressBar(((data.indexOf(event) + 1) / data.length * 100).toFixed(2) );
        eventtypes = [...new Set(data.map(e => e.event_type).filter(et => et))].sort();
        //console.log('Event types;', eventtypes);
        const location_e = event.event_location;

        if (location_e && location_e.indexOf(':') === -1) {
          if (location_e.indexOf(',') !== -1) {
            const segments = location_e.split(',');
          }
          const parsed = parseLocation(location_e);
          if (parsed) {
            const { onStreet, fromStreet, toStreet } = parsed;
            try {
              const goatResponse = await fetchSegmentFromGOAT(
                onStreet,
                fromStreet,
                toStreet,
                event.event_borough
              );

              if (goatResponse?.display) {
                const feature = segmentToGeoJSON(goatResponse.display, event);
                if (feature) {
                  geojsonFeatures.push(feature);
                } else {
                  console.warn("Invalid geometry for:", location_e);
                }
              } else {
                console.warn("No data from GOAT API for:", location_e);
              }
            } catch (err) {
              console.error("GOAT API error:", err);
            }
          }
        }

        const boro = event.event_borough;
        if (location_e && location_e.includes(':')) {
          // then we have an event in a park/athletic facility
          const [location_1, location_2] = location_e.split(':');
          safeGetPoint(boro, location_1, location_2, event);
        }
      }
          // Create a FeatureCollection for all event polygons
    const eventPolygonFeatures = events2
      .filter(e => e.geometry && (e.geometry.type === 'Polygon' || e.geometry.type === 'MultiPolygon'))
      .map(e => ({
        type: "Feature",
        geometry: e.geometry,
        properties: e
      }));
      // Combine polygons + GOAT line features
  const allEventFeatures = [
    ...eventPolygonFeatures,
    ...geojsonFeatures.map(f => ({
      type: "Feature",
      geometry: f.geometry,
      properties: {
        ...f.properties,
        event_name: f.properties.street || "Unknown Street",
        event_type: "Street Closure",
        event_borough: f.properties.borough || ""
      }
    }))
  ];
    // Create a single layer for all event polygons
    eventPolygonLayer = L.geoJSON({
      type: "FeatureCollection",
      features: allEventFeatures
    }, {
      style: feature => ({
        color: feature.geometry.type === "LineString" ? '#0077cc' : '#ff6600',
        weight: feature.geometry.type === "LineString" ? 4 : 2,
        opacity: 0.8
      }),
      onEachFeature: function (feature, layer) {
        const props = feature.properties;
        const name = props.event_name || props.street || "Unnamed Event";
        const date = props.start_date_time || "";
        layer.bindPopup(`<strong>${name}</strong><br>${date}`);
      }
    });
    layerControl.addOverlay(eventPolygonLayer, 'Event Polygons');
    const eventTypeSelect = document.getElementById('eventTypeSelect');
    eventtypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      eventTypeSelect.appendChild(option);
    })

    map.addControl(new L.Control.Search({
      container: 'findbox',
      layer: eventPolygonLayer,
      propertyName: 'event_name',
      initial: false,
      collapsed: false
    }));
    
    if (eventPolygonLayer && map.hasLayer(eventPolygonLayer)) {
      console.log('About to remove'); 
      map.removeLayer(eventPolygonLayer);
    }
    const loaderOverlay = document.getElementById('loaderOverlay');
    if (loaderOverlay) loaderOverlay.style.display = 'none';

    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';

    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.display = 'none';
        }
    

  );
})();

function applyFilters() {
    console.log('Applying filters...');

    const borough = document.getElementById('boroughSelect').value;
    const selectedBoroughs = Array.from(boroughSelect.selectedOptions)
        .map(option => option.value)
        .filter(val => val);
    if (selectedBoroughs.length === 0){
      // means all boroughs
      selectedBoroughs.push('Bronx', 'Brooklyn', 'Manhattan', 'Queens', 'Staten Island');
    }
    const eventType = document.getElementById('eventTypeSelect').value;
    const date1 = document.getElementById('dateInput1').value;
    const date2 = document.getElementById('dateInput2').value;
    // Filter events2 based on selected filters
    const filteredFeatures = events2.filter(e => {
        let match = true;
        if (selectedBoroughs.length > 0 && !selectedBoroughs.includes(e.event_borough)) match = false;
        if (eventType && e.event_type !== eventType) match = false;
        // change if below to include dates between date1 and date2, not just startinf with date1 or ending with date2
        if (date1 || date2) {
            const startDate = e.start_date_time ? new Date(e.start_date_time) : null;
            const endDate = e.end_date_time ? new Date(e.end_date_time) : null;

            const filterStart = date1 ? new Date(date1) : null;
            const filterEnd = date2 ? new Date(date2) : null;

            // Check if the event is entirely outside the filter range
            if (
                (filterEnd && startDate && startDate > filterEnd) ||
                (filterStart && endDate && endDate < filterStart)
            ) {
                match = false;
            }
        }
        return match;
    }).map(e => ({
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
            event_location = feature.properties.event_location;
            console.log('raw event location', event_location);
            if (event_location.includes(':')){
               const [location_1, location_2] = event_location.split(':');
               console.log('location_1:', location_1, 'location_2:', location_2);
               if (location_1.trim() == location_2.trim()){
                event_location = location_1;
               }
            }
            console.log('event loc:', event_location);
            layer.bindPopup(`<strong>${feature.properties.event_name}</strong><br><i>${feature.properties.event_type}</i><br>Located at ${event_location}<br>Hosted by ${feature.properties.event_agency}`);
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

    // Call showTable to show a table of the filtered events
    showTable2(filteredFeatures);
}

function showTable2(features){
  var tabledata = [];
  const tableDiv = document.getElementById('tableDiv');
  if (features.length == 0){
    tableDiv.innerHTML = '<p>No events match the selected filters</p';
    return;
  }
  features.forEach(feature => {
    const props = feature.properties;
    tabledata.push({
      event_id: props.event_id || '',
      event_name: props.event_name || '',
      event_borough: props.event_borough || '',
      event_type: props.event_type || '',
      start_date_time: props.start_date_time || ''
    })
  })
  //initialize table with tableDiv
  var table = new Tabulator("#tableDiv", {
      data:tabledata,
      autoColumns:true, 
      layout: "fitColumns"
  });
}
// Table display
function showTable(features){
  const tableDiv = document.getElementById('tableDiv');
  tableDiv.innerHTML= '';
  if (features.length == 0){
    tableDiv.innerHTML = '<p>No events match the selected filters</p';
    return;
  }
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  
  // Create table headers
  const headerRow = document.createElement('tr');
  ['Event ID', 'Event Name', 'Borough', 'Event Type', 'Start Date'].forEach(headerText => {
    const th = document.createElement('th');
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  // Create table rows
  features.forEach(feature => {
    // make each row clickable to zoom to that event on the map

    const row = document.createElement('tr');
    row.style.cursor = 'pointer';
    row.onclick = function() {
      const layer = window.filteredEventLayer.getLayers().find(l => l.feature.properties.event_id === feature.properties.event_id);
      if (layer) {
        map.flyToBounds(layer.getBounds(), {
          duration: 2.5
        });
        layer.openPopup();
      }
    }
    const props = feature.properties;
    const cells = [
      props.event_id || '',
      props.event_name || '',
      props.event_borough || '',
      props.event_type || '',
      props.start_date_time || ''
    ];
    cells.forEach(cellText => {
      const td = document.createElement('td');
      td.textContent = cellText;
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  // make tr an href and onclick to zoom to that event on the map using the event_id


  tableDiv.appendChild(table);

  
}

// Reset filters
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

// Side Nav
function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
  document.querySelector(".main").style.marginLeft = "250px";
  document.body.style.backgroundColor = "white";
}


function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  document.querySelector(".main").style.marginLeft = "0";
  document.body.style.backgroundColor = "white";
}

