(() => {
  'use strict';

  let csrfTokenCache = null;

  async function getCsrfToken() {
    if (!csrfTokenCache) {
      const res = await fetch("/api/csrf-token", { credentials: "include" });
      const data = await res.json();
      csrfTokenCache = data.csrfToken;
    }
    return csrfTokenCache;
  }

  async function api(path, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const opts = { credentials: "include", method, headers };
    if (options.body !== undefined) {
      opts.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      headers["CSRF-Token"] = await getCsrfToken();
    }

    let res = await fetch(`/api${path}`, opts);
    if (res.status === 403) {
      const text = await res.text().catch(() => "");
      if (text.includes("Invalid request token")) {
        csrfTokenCache = null;
        headers["CSRF-Token"] = await getCsrfToken();
        res = await fetch(`/api${path}`, { ...opts, headers });
      } else {
        throw new Error(text || "Forbidden");
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Request failed");
    }

    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  }

  async function loadMe() {
    try {
      const me = await api("/auth/me");
      const nameEl = document.getElementById("username");
      if (nameEl) nameEl.textContent = me.username || me.email;   // prefer username
      const wrap = document.getElementById("createBookWrap");
      if (wrap) {
        if (me.role === "admin" || me.role === "librarian") {
          wrap.style.display = "block";
        } else {
          wrap.style.display = "none";
        }
      }
      return me;
    } catch {
      window.location.href = "/frontend/html/login.html";
    }
  }

  async function loadBooks() {
    try {
      const books = await api("/books");
      const bookList = document.getElementById("bookList");
      if (!bookList) return;
      bookList.innerHTML = "";
      books.forEach((book) => {
        const div = document.createElement("div");
        div.className = "book";
        div.innerHTML = `
          <div class="title">${book.title}</div>
          <div class="author">${book.author}</div>
          <button ${book.borrowed ? "disabled" : ""} data-id="${book._id}">
            ${book.borrowed ? "Borrowed" : "Borrow"}
          </button>
        `;
        div.querySelector("button").addEventListener("click", () => borrowBook(book._id));
        bookList.appendChild(div);
      });
    } catch (e) {
      const bookList = document.getElementById("bookList");
      if (bookList) bookList.innerHTML = "<p>Error loading books</p>";
    }
  }

  async function loadBorrowedBooks() {
    const userList = document.getElementById("userList");
    if (!userList) return;
    userList.innerHTML = "";
    try {
      const me = await api("/auth/me");
      userList.innerHTML += `
        <div class="user-info">
          <p><strong>Username:</strong> ${me.username || "—"}</p>
          <p><strong>Email:</strong> ${me.email}</p>
          <p><strong>Role:</strong> ${me.role}</p>
          <p><strong>Last Login:</strong> ${me.lastLoginAt ? new Date(me.lastLoginAt).toLocaleString() : "—"}</p>
        </div>
        <hr/>
      `;
      const books = await api("/books/mine");
      if (!books.length) {
        userList.innerHTML += "<p>You have not borrowed any books.</p>";
        return;
      }
      books.forEach((book) => {
        const div = document.createElement("div");
        div.className = "book";
        div.innerHTML = `
          <div class="title">${book.title}</div>
          <div class="author">${book.author}</div>
          <button data-id="${book._id}">Return Book</button>
        `;
        div.querySelector("button").addEventListener("click", () => returnBook(book._id));
        userList.appendChild(div);
      });
    } catch {
      userList.innerHTML += "<p>Error loading borrowed books</p>";
    }
  }

  async function borrowBook(id) {
    try {
      await api(`/books/${id}/borrow`, { method: "POST" });
      await loadBooks();
    } catch (e) {
      alert(e.message || "Borrow failed");
    }
  }

  async function returnBook(id) {
    try {
      await api(`/books/${id}/return`, { method: "POST" });
      await loadBorrowedBooks();
    } catch (e) {
      alert(e.message || "Return failed");
    }
  }

  // handle create book (only visible for admin/PM)
  const createForm = document.getElementById("createBookForm");
  if (createForm) {
    createForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = document.getElementById("bookCreateMsg");
      msg.textContent = "";
      const title = document.getElementById("newTitle").value.trim();
      const author = document.getElementById("newAuthor").value.trim();
      try {
        await api("/books", { method: "POST", body: { title, author } });
        document.getElementById("newTitle").value = "";
        document.getElementById("newAuthor").value = "";
        await loadBooks();
      } catch (err) {
        msg.textContent = err.message || "Create failed.";
      }
    });
  }

  // expose for layout.js
  window.loadMe = loadMe;
  window.loadBooks = loadBooks;
  window.loadBorrowedBooks = loadBorrowedBooks;

  // initial load
  (async () => { await loadMe(); await loadBooks(); await loadBorrowedBooks(); })();
})();
