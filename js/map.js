// js/map.js
// Uses OpenTripMap for POIs and OpenRouteService for routing (both free tiers; ORS needs an API key).
// 1) Get OpenTripMap key at https://opentripmap.io/ (signup -> API Key).
// 2) Get OpenRouteService key at https://openrouteservice.org/ (signup -> API Key).
//
// Replace the placeholders below with your keys.

const OPENTRIPMAP_KEY = "REPLACE_WITH_OPENTRIPMAP_KEY"; // <-- paste your OpenTripMap key here
const ORS_API_KEY = "REPLACE_WITH_ORS_API_KEY";         // <-- paste your OpenRouteService key here

// Geocoding via OpenTripMap geocoding endpoint (no extra signup needed for small calls)
async function geocodePlace(placeName) {
  const q = encodeURIComponent(placeName);
  const url = `https://api.opentripmap.com/0.1/en/places/geoname?name=${q}&apikey=${OPENTRIPMAP_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Geocode failed");
  const data = await r.json();
  return { lat: data.lat, lon: data.lon, name: data.name };
}

// Get POIs around lat/lon using OpenTripMap (radius in meters)
async function getPOIs(lat, lon, radius = 3000, limit = 12) {
  const url = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&limit=${limit}&apikey=${OPENTRIPMAP_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("POI fetch failed");
  const data = await r.json();
  // returns array of {name, kinds, dist, xid}
  return data?.features?.map(f => ({
    name: f.properties.name || "Unnamed",
    kinds: f.properties.kinds,
    dist: f.properties.dist,
    xid: f.properties.xid,
    rate: f.properties.rate
  })) || [];
}

// More details for a POI by xid
async function getPOIDetails(xid) {
  const url = `https://api.opentripmap.com/0.1/en/places/xid/${xid}?apikey=${OPENTRIPMAP_KEY}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

// Get simple route summary from ORS between two coordinates
// startCoord/endCoord objects: {lat, lon}
async function getRouteSummary(startCoord, endCoord) {
  if (!ORS_API_KEY || ORS_API_KEY.startsWith("REPLACE")) {
    console.warn("ORS_API_KEY not set — route summary will not work. Paste your ORS key in js/map.js");
    return null;
  }
  const start = `${startCoord.lon},${startCoord.lat}`;
  const end = `${endCoord.lon},${endCoord.lat}`;
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${start}&end=${end}`;
  const r = await fetch(url);
  if (!r.ok) {
    console.error("ORS route error", await r.text());
    return null;
  }
  const data = await r.json();
  const summary = data?.features?.[0]?.properties?.summary;
  if (!summary) return null;
  return {
    distance_km: (summary.distance / 1000).toFixed(2),
    duration_min: Math.round(summary.duration / 60)
  };
}

// Expose functions
window.geocodePlace = geocodePlace;
window.getPOIs = getPOIs;
window.getPOIDetails = getPOIDetails;
window.getRouteSummary = getRouteSummary;
