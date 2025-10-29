// js/itinerary.js
// Generates itinerary using Hugging Face (inference) + enriches with POIs from OpenTripMap.
// Also initializes EmailJS for sending the itinerary to current user.
// Replace the placeholders below with your keys.

const HF_API_KEY = "REPLACE_HF_API_KEY";               // Hugging Face token
const EMAILJS_PUBLIC_KEY = "REPLACE_EMAILJS_PUBLIC";  // EmailJS public key
const EMAILJS_SERVICE_ID = "REPLACE_EMAILJS_SERVICE"; // EmailJS service id (e.g., voyage_aid_ai)
const EMAILJS_TEMPLATE_ID = "REPLACE_EMAILJS_TEMPLATE"; // EmailJS template id

// init EmailJS safely if present
function initEmailJS() {
  if (typeof emailjs === 'undefined') {
    console.warn("EmailJS SDK not loaded.");
    return;
  }
  try { emailjs.init(EMAILJS_PUBLIC_KEY); } catch(e){ console.warn(e); }
}
initEmailJS();

// small helper to call Hugging Face text generation (model can be updated by you)
async function callHF(prompt) {
  if (!HF_API_KEY || HF_API_KEY.startsWith('REPLACE')) {
    console.warn("HF key missing — using fallback itinerary.");
    return null;
  }
  const model = "gpt2"; // replace with a better model on HF if available (or a small chat model)
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${HF_API_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ inputs: prompt, options:{wait_for_model:true} })
  });
  if (!res.ok) {
    console.error("HF error", await res.text());
    return null;
  }
  const json = await res.json();
  const txt = Array.isArray(json) && json[0]?.generated_text ? json[0].generated_text : (json.generated_text || JSON.stringify(json));
  // attempt to extract JSON itinerary array from output
  const start = txt.indexOf('['), end = txt.lastIndexOf(']');
  if (start===-1 || end===-1) return { raw: txt };
  try { return JSON.parse(txt.slice(start, end+1)); } catch(e){ return { raw: txt }; }
}

// build prompt to get JSON array output
function buildPrompt(city, duration, interests, includeSnacks) {
  return `
You are Voyage Aid AI. Produce a strict JSON array of itinerary stops for ${city}.
Fields per stop: {"time":"HH:MM","name":"...","type":"place|meal|travel","duration_minutes":number,"notes":"...","maps_query":"...","youtube":""}
Include breakfast/lunch/dinner. Include snack break only if includeSnacks is true.
Preferences: ${interests.join(',')||'general'}. Total duration: ${duration}.
Return only JSON (array).
`;
}

// render helper
function renderItinerary(itArr) {
  const container = document.getElementById('itinerary-body');
  if (!container) return;
  container.innerHTML = '';
  if (!itArr) { container.innerHTML = '<p class="muted">No itinerary available.</p>'; return; }
  if (!Array.isArray(itArr)) {
    container.innerHTML = `<pre>${escapeHtml(JSON.stringify(itArr, null,2))}</pre>`; return;
  }
  itArr.forEach((s, i)=>{
    const div = document.createElement('div');
    div.className = 'it-stop';
    div.innerHTML = `
      <div>
        <div class="it-top"><div class="it-time">${escapeHtml(s.time||'')}</div><div><h3 class="it-title">${escapeHtml(s.name||'')}</h3></div></div>
        <div class="muted">${escapeHtml(s.notes||'')}</div>
      </div>
      <div class="it-links">
        <a target="_blank" href="https://www.openstreetmap.org/search?query=${encodeURIComponent(s.maps_query||s.name||'')}">Maps</a>
        ${s.youtube? `<a target="_blank" href="${escapeHtml(s.youtube)}">Video</a>` : ''}
      </div>
    `;
    container.appendChild(div);
  });
}

// simple escape
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// primary function called by itinerary.html
async function generateAndShowItinerary(city, duration, interests, includeSnacks) {
  // geocode
  const geo = await geocodePlace(city).catch(()=>null);
  const lat = geo?.lat, lon = geo?.lon;
  // get POIs
  const pois = (lat && lon) ? await getPOIs(lat, lon, 3000, 6).catch(()=>[]) : [];
  // build prompt and call HF
  const prompt = buildPrompt(city, duration, interests, includeSnacks);
  let hfResp = await callHF(prompt);
  let itinerary;
  if (!hfResp) {
    // fallback demo
    itinerary = [
      {"time":"08:00","name":"Breakfast at local cafe","type":"meal","duration_minutes":45,"notes":"Try local specialty","maps_query":`${city} cafe`,"youtube":""},
      {"time":"09:30","name":(pois[0]?.name||"City Museum"),"type":"place","duration_minutes":90,"notes":"Main attraction","maps_query":pois[0]?.name||"City museum","youtube":""},
      {"time":"13:00","name":"Lunch at recommended place","type":"meal","duration_minutes":60,"notes":"Local cuisine","maps_query":`${city} restaurant`,"youtube":""},
      {"time":"15:00","name":(pois[1]?.name||"Hidden gem"),"type":"place","duration_minutes":90,"notes":"Underrated spot","maps_query":pois[1]?.name||"Hidden spot","youtube":""},
      {"time":"19:00","name":"Dinner","type":"meal","duration_minutes":90,"notes":"","maps_query":`${city} restaurant`,"youtube":""}
    ];
  } else {
    itinerary = hfResp;
  }
  renderItinerary(itinerary);
  localStorage.setItem('voyage_last_itinerary', JSON.stringify(itinerary));
}

// send itinerary via EmailJS to logged-in user
function sendItineraryToMyEmail() {
  const current = getCurrentUserEmail();
  if (!current) { alert("Please log in"); return; }
  const it = localStorage.getItem('voyage_last_itinerary');
  if (!it) { alert("No itinerary to send."); return; }
  if (typeof emailjs === 'undefined') { alert("EmailJS not loaded."); return; }
  if (!EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID.startsWith('REPLACE')) { alert("EmailJS keys missing in js/itinerary.js"); return; }

  const params = {
    email: current,
    user_name: current.split('@')[0] || current,
    trip_destination: JSON.parse(localStorage.getItem('voyage_trip')||'{}').city || '',
    trip_details: it
  };
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
    .then(()=> alert("📩 Itinerary sent to " + current))
    .catch(err => { console.error(err); alert("Failed to send email. Check console."); });
}

// expose
window.generateAndShowItinerary = generateAndShowItinerary;
window.sendItineraryToMyEmail = sendItineraryToMyEmail;
