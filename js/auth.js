// auth.js
function register(email, password) {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  if (users.find(u => u.email === email)) return alert("⚠️ Email already registered!");
  users.push({ email, password: btoa(password) });
  localStorage.setItem("users", JSON.stringify(users));
  alert("✅ Account created successfully!");
}

function login(email, password) {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const user = users.find(u => u.email === email && u.password === btoa(password));
  if (!user) return alert("❌ Invalid credentials!");
  localStorage.setItem("currentUser", email);
  window.location.href = "/itinerary"; // redirect page slug
}

function getCurrentUser() {
  return localStorage.getItem("currentUser");
}

function logout() {
  localStorage.removeItem("currentUser");
  alert("Logged out!");
  window.location.href = "/login";
}
