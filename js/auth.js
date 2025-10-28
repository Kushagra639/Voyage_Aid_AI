// js/auth.js
// Handles client auth via LocalStorage (demo). Uses simple base64 to avoid storing plaintext passwords.
// Replace with Firebase/Auth for production.

function register(email, password) {
  if (!email || !password) return alert("Please provide both email and password.");
  const users = JSON.parse(localStorage.getItem("voyage_users") || "[]");
  if (users.find(u => u.email === email)) {
    return alert("An account with this email already exists.");
  }
  // NOTE: btoa is NOT secure cryptography. It's for demo only. For production use bcrypt/Argon2 server-side.
  users.push({ email, pass: btoa(password) });
  localStorage.setItem("voyage_users", JSON.stringify(users));
  localStorage.setItem("voyage_current", email);
  alert("Account created & logged in.");
  // redirect to planner
  window.location.href = "planner.html";
}

function login(email, password) {
  if (!email || !password) return alert("Please provide both email and password.");
  const users = JSON.parse(localStorage.getItem("voyage_users") || "[]");
  const encoded = btoa(password);
  const user = users.find(u => u.email === email && u.pass === encoded);
  if (!user) return alert("Invalid credentials.");
  localStorage.setItem("voyage_current", email);
  alert("Logged in.");
  window.location.href = "planner.html";
}

function logout() {
  localStorage.removeItem("voyage_current");
  alert("Logged out.");
  window.location.href = "index.html";
}

function getCurrentUserEmail() {
  return localStorage.getItem("voyage_current") || null;
}

// Expose functions for inline HTML onclick usage
window.register = register;
window.login = login;
window.logout = logout;
window.getCurrentUserEmail = getCurrentUserEmail;
