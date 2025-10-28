// itinerary.js

// Weather API (Open-Meteo)
async function getWeather(lat, lon) {
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
  const data = await res.json();
  return `${data.current_weather.temperature}°C, code ${data.current_weather.weathercode}`;
}

// EmailJS (for sending itinerary)
function sendItinerary(email, itinerary) {
  emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
    to_email: email,
    itinerary: itinerary
  })
  .then(() => alert("📩 Itinerary sent!"))
  .catch(err => console.error("Email error:", err));
}

async function generateItinerary(city) {
  const coords = await getCoordinates(city);
  const weather = await getWeather(coords.lat, coords.lon);
  const itinerary = `
    <h3>Itinerary for ${city}</h3>
    <p>Weather: ${weather}</p>
    <ul>
      <li>Breakfast at 8:00 AM</li>
      <li>Morning visit: City Center</li>
      <li>Lunch at 1:00 PM</li>
      <li>Evening spot: Riverfront or local attraction</li>
      <li>Dinner near hotel</li>
    </ul>
  `;

  document.getElementById("itinerary-display").innerHTML = itinerary;

  const userEmail = getCurrentUser();
  if (userEmail) sendItinerary(userEmail, itinerary);
}
