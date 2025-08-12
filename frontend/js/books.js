const user = JSON.parse(localStorage.getItem("user"));
const userId = user?.id;

function loadBooks() {
  fetch("http://localhost:3000/books")
    .then((res) => res.json())
    .then((books) => {
      const bookList = document.getElementById("bookList");
      bookList.innerHTML = "";

      books.forEach((book) => {
        const bookDiv = document.createElement("div");
        bookDiv.className = "book";

        bookDiv.innerHTML = `
          <div class="title">${book.title}</div>
          <div class="author">${book.author}</div>
          <button ${book.borrowed ? "disabled" : ""} onclick="borrowBook('${book._id}')">
            ${book.borrowed ? "Borrowed" : "Borrow"}
          </button>
        `;

        bookList.appendChild(bookDiv);
      });
    })
    .catch((err) => {
      document.getElementById("bookList").innerHTML = "<p>Error loading books</p>";
      console.error(err);
    });
}

function loadBorrowedBooks(userId) {
  const userList = document.getElementById("userList");
  userList.innerHTML = "";

  // First load user profile details
  if (user) {
    userList.innerHTML += `
      <div class="user-info">
        <p><strong>Name:</strong> ${user.fullName}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Username:</strong> ${user.username}</p>
      </div>
      <hr/>
    `;
  } else {
    userList.innerHTML = "<p>No user logged in.</p>";
  }

  // Then fetch borrowed books
  fetch(`http://localhost:3000/books/mybooks/${userId}`)
    .then((res) => res.json())
    .then((books) => {
      if (books.length === 0) {
        userList.innerHTML += "<p>You have not borrowed any books.</p>";
        return;
      }

      books.forEach((book) => {
        const bookDiv = document.createElement("div");
        bookDiv.className = "book";

        bookDiv.innerHTML = `
          <div class="title">${book.title}</div>
          <div class="author">${book.author}</div>
          <button onclick="returnBook('${book._id}', '${userId}')">
            Return Book
          </button>
        `;

        userList.appendChild(bookDiv);
      });
    })
    .catch((err) => {
      console.error("Error loading borrowed books:", err);
      userList.innerHTML += "<p>Error loading borrowed books</p>";
    });
}


function borrowBook(id) {
  if (!userId) {
    alert("You must be logged in to return a book.");
    return;
  }

  fetch(`http://localhost:3000/books/borrow/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId })
  })
    .then((res) => res.json())
    .then((response) => {
      alert(response.message || response.error);
      loadBooks();
    })
    .catch((err) => console.error(err));
}

function returnBook(id) {
  if (!userId) {
    alert("You must be logged in to return a book.");
    return;
  }
  
  fetch(`http://localhost:3000/books/return/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId })
  })
    .then((res) => res.json())
    .then((response) => {
      alert(response.message || response.error);
      loadBorrowedBooks(userId);
    })
    .catch((err) => console.error(err));
}



loadBooks();
// TODO:
// ensure that this is secure??
// also set userId upon login
// might no longer user "localStorage" once made secure
console.log(user);
loadBorrowedBooks(userId);
