const form = document.getElementById('loginForm');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  fetch("http://localhost:3000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
        return;
      }

      // Store user data in localStorage so you can use it later
      localStorage.setItem("user", JSON.stringify(data.user));

      alert("Login successful!");
      window.location.href = "booking.html";
    })
    .catch(err => {
      console.error("Login failed:", err);
      alert("Something went wrong, please try again.");
    });
});
