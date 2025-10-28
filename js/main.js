// main.js
document.addEventListener("DOMContentLoaded", () => {
  console.log("Voyage Aid AI loaded ✨");

  // Dropdown for selecting trip duration
  const durationSelect = document.querySelector("#duration-select");
  if (durationSelect) {
    const options = ["3 Hours", "6 Hours", "1 Day", "2 Days", "3 Days", "1 Week"];
    options.forEach(opt => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      durationSelect.appendChild(o);
    });
  }

  // Snack checkbox toggle
  const snackCheck = document.querySelector("#snack-option");
  if (snackCheck) {
    snackCheck.addEventListener("change", () => {
      alert(snackCheck.checked ? "Snack breaks included!" : "Snack breaks skipped!");
    });
  }
});
