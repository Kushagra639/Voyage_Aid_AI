// js/auth.js
// Simple client-side auth for demo purposes.
// - Stores users in localStorage as {email, pass:btoa(password)}
// - Exposes register, login, logout, getCurrentUserEmail
// IMPORTANT: this is for demo and buildathon only. For real apps use Firebase Auth or a server.

function register(email, password) {
  if (!email || !password) return alert("Please fill both email and password.");
  const users = JSON.parse(localStorage.getItem('voyage_users') || '[]');
  if (users.find(u=>u.email === email)) return alert("Email already registered. Log in instead.");
  users.push({ email, pass: btoa(password) });
  localStorage.setItem('voyage_users', JSON.stringify(users));
  localStorage.setItem('voyage_current', email);
  // redirect to planner
  window.location.href = 'planner.html';
}

function login(email, password) {
  if (!email || !password) return alert("Please fill both email and password.");
  const users = JSON.parse(localStorage.getItem('voyage_users') || '[]');
  const encoded = btoa(password);
  const user = users.find(u=>u.email === email && u.pass === encoded);
  if (!user) return alert("Invalid credentials.");
  localStorage.setItem('voyage_current', email);
  window.location.href = 'planner.html';
}

function logout() {
  localStorage.removeItem('voyage_current');
  window.location.href = 'index.html';
}

function getCurrentUserEmail() {
  return localStorage.getItem('voyage_current') || null;
}

// expose to global for inline handlers
window.register = register;
window.login = login;
window.logout = logout;
window.getCurrentUserEmail = getCurrentUserEmail;
