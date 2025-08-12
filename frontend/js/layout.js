// Toggle dropdown menu on username click
const usernameEl = document.getElementById("username");
const dropdownMenu = document.getElementById("userDropdown");

const user = JSON.parse(localStorage.getItem("user"));
const userId = user?.id;

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
const mBContainer = document.getElementById("manageBooksContainer");
const mRContainer = document.getElementById("manageReservationsContainer");

navItems.forEach(item => {
  item.addEventListener("click", () => {
    // Remove active class from all
    navItems.forEach(i => i.classList.remove("active"));
    // Add to clicked
    item.classList.add("active");

    // Switch content
    if (item.dataset.tab === "books") {
      booksContainer.style.display = "block";
      mBContainer.style.display = "none";
      mRContainer.style.display = "none";
      profileContainer.style.display = "none";
      loadBooks();
    } else if (item.dataset.tab === "manage-books") {
      booksContainer.style.display = "none";
      mBContainer.style.display = "block";
      mRContainer.style.display = "none";
      profileContainer.style.display = "none";
      // TODO: Load manage books logic here
    } else if (item.dataset.tab === "manage-reservations") {
      booksContainer.style.display = "none";
      mBContainer.style.display = "none";
      mRContainer.style.display = "block";
      profileContainer.style.display = "none";
      // TODO: Load reservations logic here
    } else if (item.dataset.tab === "profile") {
      booksContainer.style.display = "none";
      mBContainer.style.display = "none";
      mRContainer.style.display = "none";
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

