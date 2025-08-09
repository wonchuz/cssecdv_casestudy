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
          <button ${book.reserved ? "disabled" : ""} onclick="reserveBook(${book.id})">
            ${book.reserved ? "Reserved" : "Reserve"}
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

function reserveBook(id) {
  fetch(`http://localhost:3000/reserve/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.json())
    .then((response) => {
      alert(response.message || response.error);
      loadBooks();
    })
    .catch((err) => console.error(err));
}

loadBooks();
