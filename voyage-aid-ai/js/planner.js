function generateItinerary() {
  const city = document.getElementById("city").value;
  const duration = document.getElementById("duration").value;
  const snack = document.getElementById("snack").checked;

  const interests = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
                         .map(e => e.value);

  if (!city) return alert("Please select a city!");

  const data = { city, duration, interests, snack };
  localStorage.setItem("tripData", JSON.stringify(data));

  window.location.href = "itinerary.html";
}
