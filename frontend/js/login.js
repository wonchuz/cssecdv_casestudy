const form = document.getElementById('loginForm');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const username = form.username.value.trim();
  const password = form.password.value.trim();

  if (username && password) {
    // Redirect to booking page on successful input
    window.location.href = 'booking.html';
  } else {
    alert('Please enter both username and password.');
  }
});
