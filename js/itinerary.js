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
// Generates plain-text itinerary from OpenRouter
async function generateItinerary(city, days, preferences) {
  // days is expected as readable text: "2 days" or "1 day" etc.
  try {
    const model = "mistralai/mistral-7b-instruct"; // reliable free instruction model
    const payload = {
      model,
      messages: [
        { role: "system", content: "You are Voyage Aid AI — a helpful travel planner. Output either (A) a strict JSON array of stops OR (B) readable text. If you output JSON, return only JSON. Each stop fields: time, name, type, duration_minutes, notes, maps_query, youtube." },
        { role: "user", content: `Create a ${days} itinerary for ${city} focusing on ${preferences.length? preferences.join(", "): "general"}. Include breakfast, lunch, dinner, travel times, hidden gems, and underrated places. Prefer concise, structured output. If possible, return a JSON array.` }
      ],
      max_tokens: 800,
      temperature: 0.7
    };

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("OpenRouter response:", data); // <-- IMPORTANT: inspect this in browser console

    // OpenRouter typical path: data.choices[0].message.content
    const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || (typeof data === 'string' ? data : null);
    if (!content) {
      console.warn("OpenRouter returned no content. See console for 'OpenRouter response'.");
      return null;
    }
    return content;
  } catch (err) {
    console.error("generateItinerary (OpenRouter) error:", err);
    return null;
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
    // Build prompt & call OpenRouter generator
    const aiText = await generateItinerary(city, duration, interests);
    if (!aiText) {
      console.warn("AI returned empty — using fallback.");
      const fallback = [
        { "time": "08:00", "name": "Breakfast at local cafe", "notes": "Try local specialty", "maps_query": `${city} cafe` },
        { "time": "09:30", "name": "Main attraction", "notes": "Explore must-see spots" },
        { "time": "13:00", "name": "Lunch at recommended place", "notes": "Local cuisine" },
        { "time": "15:00", "name": "Hidden gem", "notes": "Underrated spot" },
        { "time": "19:00", "name": "Dinner", "notes": "End your day with great food" }
      ];
      renderItinerary(fallback);
      localStorage.setItem('voyage_last_itinerary', JSON.stringify(fallback));
      return;
    }

    // If AI returned JSON string, parse; otherwise show raw text nicely
    let parsed = null;
    // try to find JSON block inside the AI text
    const start = aiText.indexOf('['), end = aiText.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = aiText.slice(start, end+1);
      try {
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.warn("Failed to JSON.parse AI JSON block:", e);
        parsed = null;
      }
    }

    if (Array.isArray(parsed)) {
      renderItinerary(parsed);
      localStorage.setItem('voyage_last_itinerary', JSON.stringify(parsed));
      console.log("Rendered AI JSON itinerary.");
      return;
    }

    // If parsed not available, still attempt to split the plain text into simple stops (best-effort)
    // Show raw AI output (readable)
    const container = document.getElementById('itinerary-body');
    // --- Convert markdown-ish AI text into readable HTML ---
    function markdownToHtml(md) {
      return md
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(/`(.*?)`/gim, '<code>$1</code>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/\n<li>/gim, '<ul><li>').replace(/<\/li>\n(?!<li>)/gim, '</li></ul>')
        .replace(/\n/gim, '<br>')
        .replace(
          /Maps Query:?["“”']?([^"“”'\n]+)["“”']?/gi,
          '<a href="https://www.google.com/maps/search/$1" target="_blank">🗺️ $1</a>'
        )
        .replace(
          /YouTube:?["“”']?([^"“”'\n]+)["“”']?/gi,
          '<a href="https://www.youtube.com/results?search_query=$1" target="_blank">▶️ $1</a>'
        );
    }
    container.innerHTML = `<div class="markdown">${markdownToHtml(aiText)}</div>`;
    // also save raw text
    localStorage.setItem('voyage_last_itinerary', JSON.stringify({ raw: aiText }));
    console.log("Rendered AI plain text itinerary.");
  } catch (error) {
    console.error("Error in generateAndShowItinerary:", error);
    alert("Failed to generate itinerary. Check console for errors.");
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
