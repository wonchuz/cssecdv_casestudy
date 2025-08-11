// Toggle dropdown menu on username click
const usernameEl = document.getElementById("username");
const dropdownMenu = document.getElementById("userDropdown");

usernameEl.addEventListener("click", () => {
  dropdownMenu.classList.toggle("show");
});

// Hide dropdown when clicking outside
window.addEventListener("click", (e) => {
  if (!usernameEl.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.classList.remove("show");
  }
});

// Sidebar navigation
const navItems = document.querySelectorAll(".nav-item");
const booksContainer = document.getElementById("booksContainer");
const profileContainer = document.getElementById("profileContainer");

navItems.forEach(item => {
  item.addEventListener("click", () => {
    // Remove active class from all
    navItems.forEach(i => i.classList.remove("active"));
    // Add to clicked
    item.classList.add("active");

    // Switch content
    if (item.dataset.tab === "books") {
      booksContainer.style.display = "block";
      profileContainer.style.display = "none";
      loadBooks();
    } else if (item.dataset.tab === "profile") {
      booksContainer.style.display = "none";
      profileContainer.style.display = "block";
      loadBorrowedBooks(localStorage.getItem("userId"));
    }
  });
});

document.getElementById("changePasswordBtn").addEventListener("click", () => {
  // Your change password logic or redirect
  alert("Redirect to Change Password page or open modal");
  // window.location.href = "/change-password.html";
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  // Your logout logic
  alert("Logging out...");
  window.location.href = "/login.html";
});
