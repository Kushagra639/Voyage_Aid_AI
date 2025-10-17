function loadItinerary() {
  const itineraryDiv = document.getElementById("itinerary");
  const data = JSON.parse(localStorage.getItem("tripData"));

  if (!data) {
    itineraryDiv.innerHTML = "<p>No trip data found!</p>";
    return;
  }

  itineraryDiv.innerHTML = `
    <h2>${data.city.toUpperCase()} — ${data.duration.replace('-', ' ')}</h2>
    <p>Based on your interests: ${data.interests.join(', ') || 'General exploration'}</p>
    <ul>
      <li>🍳 Breakfast</li>
      <li>🏛️ Sightseeing & activities</li>
      <li>🍽️ Lunch</li>
      <li>🎒 More exploration ${data.snack ? '🧁 + Snack break' : ''}</li>
      <li>🍷 Dinner</li>
    </ul>
    <p><i>AI will later generate detailed routes & timings.</i></p>
  `;
}

function sendToEmail() {
  const email = localStorage.getItem("voyageEmail");
  if (!email) return alert("Please log in first!");
  alert(`Your itinerary has been sent to ${email} (via EmailJS later).`);
}

window.onload = loadItinerary;
