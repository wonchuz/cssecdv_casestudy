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

      const transactionsTab = document.querySelector('[data-tab="transactions"]');
      const rolesTab = document.querySelector('[data-tab="roles"]');
      const manageReservationsTab = document.querySelector('[data-tab="roles"]');
        if (transactionsTab || rolesTab) {
          if (me.role === "admin") {
            transactionsTab.style.display = "block";
            rolesTab.style.display = "block";
          } else {
            transactionsTab.style.display = "none";
            rolesTab.style.display = "none";
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
        <h3 style="margin:10px 0;">Borrowed Books</h3>
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
        `;
        userList.appendChild(div);
      });
    } catch {
      userList.innerHTML = "<p>Error loading borrowed books</p>";
    }
  }

  async function loadAllTransactions() {
    const transactionList = document.getElementById("transactionList");
    if (!transactionList) return;
    transactionList.innerHTML = "";

    try {
      const logs = await api("/auth/logs");

      if (!Array.isArray(logs) || !logs.length) {
        transactionList.innerHTML = "<p>No log entries found.</p>";
        return;
      }
      
      // Filter out log entries where evt is 'REQ' or 'RESP'
      const filteredLogs = logs.filter(log => {
          // We'll check both top-level 'evt' and nested 'message.evt' for robustness
          const eventType = log.evt || (log.message ? log.message.evt : '');
          return eventType !== 'REQ' && eventType !== 'RESP';
      });

      if (filteredLogs.length === 0) {
        transactionList.innerHTML = "<p>No other log entries found.</p>";
        return;
      }

      filteredLogs.forEach(log => {
        const div = document.createElement("div");
        div.className = "log-entry";

        const logMessage = JSON.stringify(log, null, 2);

        div.innerHTML = `
          <div class="log-details">
            <pre>${logMessage}</pre>
          </div>
        `;
        transactionList.appendChild(div);
      });

    } catch (error) {
      console.error("Error loading transactions:", error);
      transactionList.innerHTML = "<p>Error loading log history.</p>";
    }
  }

async function loadRoles() {
  const roleList = document.getElementById("roleList");
  if (!roleList) return;
  roleList.innerHTML = "";

  try {
    const me = await api("/auth/me");
    let users = await api("/auth/users");

    users = users.filter(user => user._id !== me.id);

    if (users.length === 0) {
      roleList.innerHTML = "<p>No other users found.</p>";
      return;
    }

    roleList.innerHTML += `
      <div class="user-roles-header">
        <h3>User Roles</h3>
      </div>
    `;

    users.forEach(user => {
      const div = document.createElement("div");
      div.className = "user-role-item";
      div.innerHTML = `
        <div class="user-role-content">
          <div class="user-details">
            <p><strong>Username:</strong> ${user.username || "—"}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Current Role:</strong> ${user.role}</p>
          </div>
          <div class="role-actions">
            <button class="role-btn ${user.role === 'admin' ? 'current-role-disabled' : ''}" data-user-id="${user._id}" data-role="admin" ${user.role === 'admin' ? 'disabled' : ''}>Admin</button>
            <button class="role-btn ${user.role === 'librarian' ? 'current-role-disabled' : ''}" data-user-id="${user._id}" data-role="librarian" ${user.role === 'librarian' ? 'disabled' : ''}>Librarian</button>
            <button class="role-btn ${user.role === 'customer' ? 'current-role-disabled' : ''}" data-user-id="${user._id}" data-role="customer" ${user.role === 'customer' ? 'disabled' : ''}>Customer</button>
          </div>
        </div>
      `;
      roleList.appendChild(div);
    });

    // Add event listeners for the new role buttons
    document.querySelectorAll(".role-btn").forEach(button => {
      button.addEventListener("click", (event) => {
        const userId = event.target.dataset.userId;
        const newRole = event.target.dataset.role;
        changeRole(userId, newRole);
      });
    });

    } catch (error) {
      console.error("Error loading user roles:", error);
      roleList.innerHTML = "<p>Error loading user roles.</p>";
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

  async function changeRole(userId, newRole) {
    try {
      const res = await api(`/auth/change-role/${userId}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: newRole }),
      });
      
      // Assuming your API returns a JSON object like { ok: true } on success
      if (res.message === "Role updated successfully.") {
        alert(`Successfully changed role to ${newRole}`);
        loadRoles(); // Reload the list to show the change
      } else {
        // If the message is anything else, it's likely an error.
        alert(`Failed to change role: ${res.message}`);
      }
    } catch (error) {
      console.error("Role change failed:", error);
      alert("An error occurred while changing the role.");
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

  // Get all reservations (librarian only)
  async function fetchReservations() {
    try {
      const res = await fetch("/books/reservations", {
        method: "GET",
        credentials: "include" // send cookies/session
      });
      if (!res.ok) throw new Error("Failed to fetch reservations");
      const data = await res.json();
      // console.log("Reservations:", data);
      return data;
    } catch (err) {
      console.error(err);
    }
  }

  // Update reservation status
  async function updateReservationStatus(reservationId, newStatus) {
    try {
      const res = await fetch(`/books/${reservationId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }
      console.log("Updated reservation:", data);
      return data;
    } catch (err) {
      console.error(err);
    }
  }

  // Render reservations into the DOM
  async function loadReservations() {
    const container = document.getElementById("reservationList");
    container.innerHTML = "<p>Loading reservations...</p>";

    const reservations = await fetchReservations();
    container.innerHTML = ""; // clear loading text

    reservations.forEach(res => {
      const row = document.createElement("div");
      row.innerHTML = `
        <strong>${res.book?.title || "Unknown Book"}</strong> 
        — Reserved by: ${res.reservedBy?.username || "Unknown User"} 
        — Status: ${res.status}
        ${renderButtons(res)}
      `;
      container.appendChild(row);
    });
  }

  // Decide which buttons to show based on status
  function renderButtons(reservation) {
    let buttons = "";

    switch (reservation.status) {
      case "pending":
        buttons += `<button onclick="handleStatusChange('${reservation._id}', 'confirmed')">Confirm</button>`;
        buttons += `<button onclick="handleStatusChange('${reservation._id}', 'cancelled')">Cancel</button>`;
        break;
      case "confirmed":
        buttons += `<button onclick="handleStatusChange('${reservation._id}', 'borrowed')">Borrow</button>`;
        buttons += `<button onclick="handleStatusChange('${reservation._id}', 'cancelled')">Cancel</button>`;
        break;
      case "borrowed":
        buttons += `<button onclick="handleStatusChange('${reservation._id}', 'returned')">Return</button>`;
        break;
      case "returned":
      case "cancelled":
        buttons += `<span>No actions available</span>`;
        break;
    }

    return buttons;
  }

  // Handle status change and reload
  async function handleStatusChange(id, status) {
    await updateReservationStatus(id, status);
    loadReservations();
  }


  // expose for layout.js
  window.loadMe = loadMe;
  window.loadBooks = loadBooks;
  window.loadBorrowedBooks = loadBorrowedBooks;
  window.loadAllTransactions = loadAllTransactions;
  window.loadRoles = loadRoles;
  window.loadReservations = loadReservations;

  // initial load
  (async () => { await loadMe(); await loadBooks(); await loadBorrowedBooks(); await loadAllTransactions();})();
})();
