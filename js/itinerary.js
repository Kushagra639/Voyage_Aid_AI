// js/itinerary.js
// Generates itinerary using Hugging Face (inference) + enriches with POIs from OpenTripMap.
// Also initializes EmailJS for sending the itinerary to current user.
// Replace the placeholders below with your keys.

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


// --- New OpenRouter API version ---
// Make sure to create your key at https://openrouter.ai/settings/keys

const OPENROUTER_API_KEY = "YOUR_KEY_HERE";
async function generateItinerary(city, days, preferences) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-nano-12b-v2-vl:free",
        messages: [
          {
            role: "system",
            content: "You are Voyage Aid AI — an expert trip planner that makes efficient, creative itineraries."
          },
          {
            role: "user",
            content: `Create a ${days}-day detailed travel itinerary for ${city}, focusing on ${preferences.join(", ")}. Include breakfast, lunch, dinner, travel times, hidden gems, and underrated places.`
          }
        ]
      })
    });

    const data = await response.json();
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    } else {
      console.warn("Fallback triggered:", data);
      return demoItinerary(); // fallback in case API fails
    }
  } catch (err) {
    console.error("AI generation error:", err);
    return demoItinerary();
  }
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
  try {
    // Build AI prompt using OpenRouter
    const aiText = await generateItinerary(city, duration, interests);

    // Try parsing AI response as structured text
    let itinerary = [];
    try {
      itinerary = JSON.parse(aiText);
    } catch {
      // Fallback to generic parsing
      itinerary = [
        { "time": "08:00", "name": "Breakfast at local cafe", "notes": "Try local specialty", "maps_query": `${city} cafe` },
        { "time": "09:30", "name": "Main attraction", "notes": "Explore must-see spots" },
        { "time": "13:00", "name": "Lunch at recommended place", "notes": "Local cuisine" },
        { "time": "15:00", "name": "Hidden gem", "notes": "Underrated spot" },
        { "time": "19:00", "name": "Dinner", "notes": "End your day with great food" }
      ];
    }

    // Render the itinerary
    renderItinerary(itinerary);

    // Save for email export
    localStorage.setItem('voyage_last_itinerary', JSON.stringify(itinerary));
    console.log("✅ Itinerary generated and displayed successfully.");

  } catch (error) {
    console.error("Error generating itinerary:", error);
    alert("Failed to generate itinerary. Please try again later.");
  }
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
