function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (email && password) {
    localStorage.setItem("voyageEmail", email);
    alert("Login successful!");
    window.location.href = "planner.html";
  } else {
    alert("Please fill in both fields.");
  }
}

function toggleSignup() {
  alert("Signup feature can reuse same form. Just enter new credentials!");
}
