// js/itinerary.js
// Itinerary generation & email sending.
// Required keys (replace placeholders below):
// 1) OpenTripMap key -> already used in js/map.js (OPENTRIPMAP_KEY)
// 2) Hugging Face token -> paste into HF_API_KEY below
// 3) EmailJS: PUBLIC_KEY, SERVICE_ID, TEMPLATE_ID (see EmailJS dashboard)

// HUGGING FACE inference token (create account at https://huggingface.co/)
const HF_API_KEY = "REPLACE_WITH_HF_API_KEY"; // <-- paste your HF token here

// EmailJS details (sign up at https://www.emailjs.com/)
const EMAILJS_PUBLIC_KEY = "REPLACE_WITH_EMAILJS_PUBLIC_KEY"; // <-- paste
const EMAILJS_SERVICE_ID = "REPLACE_WITH_EMAILJS_SERVICE_ID"; // <-- paste
const EMAILJS_TEMPLATE_ID = "REPLACE_WITH_EMAILJS_TEMPLATE_ID"; // <-- paste

// Helper: fetch weather via Open-Meteo (no key)
async function fetchWeatherAt(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const d = await r.json();
  return d.current_weather; // {temperature, windspeed, weathercode, ...}
}

// Build an AI prompt for HF to generate structured itinerary
function buildItineraryPrompt(cityName, durationLabel, interests, includeSnacks = false) {
  // Few-shot + strict JSON output request to make HF produce parseable JSON
  const prompt = `
You are Voyage Aid AI. Output a strict JSON array of itinerary stops for a visitor in ${cityName}.
Fields for each stop: {"time": "HH:MM", "name": "...", "type": "place|meal|travel", "duration_minutes": number, "notes":"...", "maps_query":"...","youtube":"..."}
Include breakfast, lunch, dinner in reasonable hours. Include snack breaks only if includeSnacks=true.
User preferences: ${interests.join(", ") || "general"}.
Total duration: ${durationLabel}.
Prefer local + underrated spots in addition to key sights.
Return ONLY valid JSON (an array). No prose outside JSON.
Example output:
[
 {"time":"09:00","name":"City Museum","type":"place","duration_minutes":60,"notes":"Skip busy times","maps_query":"City Museum, ${cityName}","youtube":""},
 ...
]
Now produce the itinerary for the user.
`;
  return prompt;
}

// Call Hugging Face Inference API with a prompt, expect text output which we will JSON.parse
async function callHuggingFace(prompt) {
  if (!HF_API_KEY || HF_API_KEY.startsWith("REPLACE")) {
    console.warn("HF_API_KEY not set — using fallback demo itinerary.");
    return null;
  }
  const res = await fetch("https://api-inference.huggingface.co/models/gpt2", { // using gpt2 as placeholder; consider a better model id
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true, use_cache: false } })
  });
  if (!res.ok) {
    console.error("HF request failed", await res.text());
    return null;
  }
  const out = await res.json();
  // HF inference returns varied shapes; handle common case where out is [{generated_text: "..."}]
  const text = Array.isArray(out) && out[0]?.generated_text ? out[0].generated_text : (out?.generated_text || (typeof out === "string" ? out : JSON.stringify(out)));
  // try to parse JSON substring inside text
  const jsonStart = text.indexOf("[");
  const jsonEnd = text.lastIndexOf("]") + 1;
  if (jsonStart === -1 || jsonEnd === -1) {
    console.warn("Couldn't extract JSON from HF output. Returning raw text.");
    return { raw: text };
  }
  const jsonStr = text.slice(jsonStart, jsonEnd);
  try {
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (e) {
    console.error("JSON parse error from HF output", e, jsonStr);
    return { raw: text };
  }
}

// Render itinerary to DOM (itinerary container 'itinerary-body' expected in itinerary.html)
function renderItinerary(itArr) {
  const container = document.getElementById("itinerary-body");
  if (!container) {
    console.error("No #itinerary-body in DOM.");
    return;
  }
  if (!itArr) {
    container.innerHTML = "<p>No itinerary data available.</p>";
    return;
  }

  // if HF returned raw text instead of JSON array
  if (!Array.isArray(itArr)) {
    container.innerHTML = `<pre>${escapeHtml(JSON.stringify(itArr, null, 2))}</pre>`;
    return;
  }

  container.innerHTML = ""; // clear
  itArr.forEach((stop, idx) => {
    const div = document.createElement("div");
    div.className = "it-stop card";
    const time = stop.time || "";
    const title = stop.name || "Unnamed";
    const type = stop.type || "place";
    const dur = stop.duration_minutes ? `${stop.duration_minutes} mins` : "";
    const notes = stop.notes || "";
    const mapsQuery = stop.maps_query || `${title}`;
    const youtube = stop.youtube || "";

    div.innerHTML = `
      <div class="it-top">
        <strong class="it-time">${time}</strong>
        <h3 class="it-title">${escapeHtml(title)}</h3>
        <span class="it-type">${type}</span>
      </div>
      <div class="it-meta">
        <span>${dur}</span>
        <span>${escapeHtml(notes)}</span>
      </div>
      <div class="it-links">
        <a target="_blank" rel="noopener" href="https://www.openstreetmap.org/search?query=${encodeURIComponent(mapsQuery)}">Maps</a>
        ${youtube ? `<a target="_blank" rel="noopener" href="${escapeHtml(youtube)}">Video</a>` : ''}
        <button onclick="removeStop(${idx})">Skip</button>
      </div>
    `;
    container.appendChild(div);
  });
}

// small helper
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

// remove a stop (simple UI change) — user can modify UI to request regeneration
function removeStop(index) {
  const container = document.getElementById("itinerary-body");
  const stops = Array.from(container.querySelectorAll(".it-stop"));
  if (stops[index]) {
    stops[index].style.opacity = 0.4;
    stops[index].querySelector("button").textContent = "Removed";
    // do not alter AI data model here — optional enhancement: update model array in memory
  }
}

// Main: generate itinerary using HF + local POIs for enrichment
async function generateAndShowItinerary(cityName, durationLabel, interests = [], includeSnacks = false) {
  const placeInfo = await window.geocodePlace(cityName).catch(e => {
    alert("City not found: " + e.message);
    return null;
  });
  if (!placeInfo) return;

  // fetch POIs to include sample names (optional enrichment)
  const pois = await window.getPOIs(placeInfo.lat, placeInfo.lon, 3000, 8).catch(e => {
    console.warn("POI fetch failed", e);
    return [];
  });

  // build prompt and call HF
  const prompt = buildItineraryPrompt(cityName, durationLabel, interests, includeSnacks);
  const hfResult = await callHuggingFace(prompt);

  let itinerary;
  if (!hfResult) {
    // fallback demo if HF not configured
    itinerary = [
      {"time":"08:00","name":"Breakfast at local cafe","type":"meal","duration_minutes":45,"notes":"Try local dish","maps_query":`${cityName} cafe`,"youtube":""},
      {"time":"09:00","name":(pois[0]?.name || "City Center"),"type":"place","duration_minutes":90,"notes":"Main attraction","maps_query":(pois[0]?.name || "City Center"),"youtube":""},
      {"time":"12:30","name":"Lunch - recommended spot","type":"meal","duration_minutes":60,"notes":"","maps_query":`${cityName} restaurant`,"youtube":""},
      {"time":"14:00","name":(pois[1]?.name || "Hidden gem"),"type":"place","duration_minutes":90,"notes":"Underrated spot","maps_query":(pois[1]?.name || "Hidden gem"),"youtube":""},
      {"time":"19:00","name":"Dinner at recommended restaurant","type":"meal","duration_minutes":90,"notes":"","maps_query":`${cityName} restaurant`,"youtube":""}
    ];
  } else {
    itinerary = hfResult;
  }

  renderItinerary(itinerary);
  // store last itinerary in localStorage so Send-to-email can use it
  localStorage.setItem("voyage_last_itinerary", JSON.stringify(itinerary));
}

// EMAIL: init EmailJS (ensure you included the emailjs script in itinerary.html)
function initEmailJS() {
  if (typeof emailjs === "undefined") {
    console.warn("EmailJS not loaded. Add the EmailJS script in itinerary.html.");
    return;
  }
  if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY.startsWith("REPLACE")) {
    console.warn("EmailJS public key not set.");
    return;
  }
  try { emailjs.init(EMAILJS_PUBLIC_KEY); } catch(e){}
}

// Send itinerary stored in localStorage to current user's email
function sendItineraryToMyEmail() {
  const current = localStorage.getItem("voyage_current");
  if (!current) return alert("Please log in first to send to your account email.");
  const it = localStorage.getItem("voyage_last_itinerary");
  if (!it) return alert("No itinerary to send. Generate one first.");
  const templateParams = {
    to_email: current,
    itinerary: it
  };
  if (!EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID.startsWith("REPLACE")) {
    alert("EmailJS keys not set. Paste them into js/itinerary.js");
    return;
  }
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then(() => alert("Itinerary sent to " + current))
    .catch(err => {
      console.error("EmailJS error:", err);
      alert("Failed to send email. Check console.");
    });
}

// Expose functions to global scope for onClick usage
window.generateAndShowItinerary = generateAndShowItinerary;
window.sendItineraryToMyEmail = sendItineraryToMyEmail;
window.initEmailJS = initEmailJS;

// initialize emailjs on load (if script present)
document.addEventListener("DOMContentLoaded", () => {
  initEmailJS();
});
