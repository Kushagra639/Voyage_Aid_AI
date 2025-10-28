// map.js
const ORS_API_KEY = "YOUR_OPENROUTESERVICE_KEY"; // get from openrouteservice.org

async function getCoordinates(place) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${place}`);
  const data = await res.json();
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

async function getRoute(startPlace, endPlace) {
  const start = await getCoordinates(startPlace);
  const end = await getCoordinates(endPlace);

  const res = await fetch(
    `https://api.openrouteservice.org/v2/directions/driving-car?api_key=$eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImZmMTRiY2U5MGVmNDRmODA5ZjRjNzY3MjQ0OTE1NTgyIiwiaCI6Im11cm11cjY0In0=&start=${start.lon},${start.lat}&end=${end.lon},${end.lat}`
  );
  const data = await res.json();
  const summary = data.features[0].properties.summary;

  document.getElementById("map-output").innerHTML = `
    <p>Distance: ${(summary.distance / 1000).toFixed(2)} km</p>
    <p>Estimated Time: ${(summary.duration / 3600).toFixed(1)} hrs</p>
    <a href="https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${start.lat},${start.lon};${end.lat},${end.lon}" target="_blank">View Route on Map</a>
  `;
}
