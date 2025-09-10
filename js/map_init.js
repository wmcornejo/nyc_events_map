const map = L.map('map', { fullscreenControl: true }).setView([40.74281318841831, -73.92931873140857], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

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


$.getJSON('https://data.cityofnewyork.us/resource/tvpp-9vvx.json?$limit=50', function(data) {
  console.log('Events:', data);

  let delay = 0;

  data.forEach((event, i) => {
    const location_e = event.event_location;
    if (location_e && location_e.includes(':')) {
      const location_2 = location_e.split(':')[0];
     //setTimeout(() => {
     //   searchPlace(location_2);
     // }, delay);

      //delay += 1000; // 1 second between requests
    }
  });
});


fetch('data/Borough Boundaries_20250909.geojson')
  .then(res => res.json())
  .then(geojson => {
    L.geoJSON(geojson, {
      style: {
        color: '#3366cc',
        weight: 2,
        fillOpacity: 0.1
      }
    }).addTo(map);
  })

fetch('data/NYC Community Boards_20250909.geojson')
  .then(res => res.json())
  .then(geojson => {
    L.geoJSON(geojson, {
      style: {
        color: '#3366cc',
        weight: 2,
        fillOpacity: 0.1
      }
    }).addTo(map);
  })