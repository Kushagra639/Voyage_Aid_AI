// js/main.js
// general UI helpers: fill duration dropdowns, apply nice checkbox behavior, update nav auth links.

document.addEventListener('DOMContentLoaded', ()=>{
  // populate duration selects on any page that has class 'duration-select'
  const options = [
    {v:'3h', t:'Half Day (3 hours)'},
    {v:'6h', t:'Most of Day (6 hours)'},
    {v:'1d', t:'1 Day'},
    {v:'2d', t:'2 Days'},
    {v:'3-5d', t:'3–5 Days'},
    {v:'1w', t:'1 Week'}
  ];
  document.querySelectorAll('.duration-select').forEach(sel=>{
    sel.innerHTML = ''; options.forEach(o=>{
      const opt = document.createElement('option'); opt.value = o.v; opt.textContent = o.t; sel.appendChild(opt);
    });
  });

  // enhance fancy-checkbox labels to be clickable (works by wrapping input)
  document.querySelectorAll('.chip input[type="checkbox"]').forEach(cb=>{
    cb.addEventListener('change', ()=> {
      // visual handled by CSS .fancy-checkbox
    });
  });

  // show logged in user in any element with .current-user-email
  const cur = localStorage.getItem('voyage_current');
  if (cur) {
    document.querySelectorAll('.current-user-email').forEach(el=> el.textContent = cur);
    // update nav auth link if present
    document.querySelectorAll('.nav-links a').forEach(a=>{
      if (a.id === 'auth-link') { a.textContent = 'My Account'; a.href = 'itinerary.html'; }
    });
  }
});
