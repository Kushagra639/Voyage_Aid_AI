// js/main.js
// Handles UI bits common to pages: duration dropdown, snack checkbox behaviour, and simple form validation.

document.addEventListener("DOMContentLoaded", () => {
  // populate duration selectors if present
  const durationSelects = document.querySelectorAll(".duration-select");
  const options = [
    {val:"3h", text:"Half Day (3 hours)"},
    {val:"6h", text:"Most of Day (6 hours)"},
    {val:"1d", text:"1 Day"},
    {val:"2d", text:"2 Days"},
    {val:"3-5d", text:"3–5 Days"},
    {val:"1w", text:"1 Week"}
  ];
  durationSelects.forEach(sel => {
    // clear any existing
    sel.innerHTML = "";
    options.forEach(o => {
      const opt = document.createElement("option");
      opt.value = o.val; opt.textContent = o.text;
      sel.appendChild(opt);
    });
  });

  // Auto-fill current user's email into pages that show it (if applicable)
  const current = localStorage.getItem("voyage_current");
  if (current) {
    const emailEls = document.querySelectorAll(".current-user-email");
    emailEls.forEach(e => e.textContent = current);
  }

  // snack checkbox helper (optional UX tweak)
  const snackChecks = document.querySelectorAll(".snack-checkbox");
  snackChecks.forEach(cb => {
    cb.addEventListener("change", () => {
      if (cb.checked) {
        cb.closest("label")?.classList?.add("snack-enabled");
      } else {
        cb.closest("label")?.classList?.remove("snack-enabled");
      }
    });
  });
});
