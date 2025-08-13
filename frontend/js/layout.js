(() => {
  'use strict';

  // tabs
  const navItems = document.querySelectorAll(".nav-item");
  const booksContainer = document.getElementById("booksContainer");
  const profileContainer = document.getElementById("profileContainer");
  const transactionsContainer = document.getElementById("transactionsContainer");
  const rolesContainer = document.getElementById("rolesContainer");

  navItems.forEach((item) => {
    item.addEventListener("click", async () => {
      navItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      const user = await loadMe();

      if (item.dataset.tab === "books") {
        if (booksContainer) booksContainer.style.display = "block";
        if (profileContainer) profileContainer.style.display = "none";
        if (transactionsContainer) transactionsContainer.style.display = "none";
        if (rolesContainer) rolesContainer.style.display = "none";
        if (typeof window.loadBooks === "function") window.loadBooks();
      } else if (item.dataset.tab === "profile") {
        if (booksContainer) booksContainer.style.display = "none";
        if (profileContainer) profileContainer.style.display = "block";
        if (transactionsContainer) transactionsContainer.style.display = "none";
        if (rolesContainer) rolesContainer.style.display = "none";
        if (typeof window.loadBorrowedBooks === "function") window.loadBorrowedBooks();
        // refresh security question when switching to profile
        await loadSecurityQuestion();
      } else if (item.dataset.tab === "transactions") {
        if (booksContainer) booksContainer.style.display = "none";
        if (profileContainer) profileContainer.style.display = "none";
        if (transactionsContainer) transactionsContainer.style.display = "block";
        if (rolesContainer) rolesContainer.style.display = "none";
        if (typeof window.loadAllTransactions === "function") window.loadAllTransactions();
      } else if (item.dataset.tab === "roles") {
        if (booksContainer) booksContainer.style.display = "none";
        if (profileContainer) profileContainer.style.display = "none";
        if (transactionsContainer) transactionsContainer.style.display = "none";
        if (rolesContainer) rolesContainer.style.display = "block";
        if (typeof window.loadRoles === "function") window.loadRoles();
      }
    });
  });

  // CSRF
  let csrfTokenCache = null;
  async function getCsrfToken() {
    if (!csrfTokenCache) {
      const res = await fetch("/api/csrf-token", { credentials: "include" });
      const data = await res.json();
      csrfTokenCache = data.csrfToken;
    }
    return csrfTokenCache;
  }
  async function apiFetch(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = { ...(options.headers || {}) };
    const init = { method, credentials: "include", headers };
    if (options.body !== undefined) {
      init.headers["Content-Type"] = init.headers["Content-Type"] || "application/json";
      init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      init.headers["CSRF-Token"] = await getCsrfToken();
    }
    let res = await fetch(url, init);
    if (res.status === 403) {
      const text = await res.text().catch(() => "");
      if (!options.__retried && text.includes("Invalid request token")) {
        csrfTokenCache = null;
        init.headers["CSRF-Token"] = await getCsrfToken();
        res = await fetch(url, { ...init, __retried: true });
      } else {
        throw new Error(text || "Forbidden");
      }
    }
    return res;
  }

  // toggle helpers (profile form)
  const t1 = document.getElementById("showCurrentPwd");
  const t2 = document.getElementById("showSqAnswer");
  const t3 = document.getElementById("showNewPwd");
  const t4 = document.getElementById("showConfirmNewPwd");
  t1?.addEventListener("change", e => { document.getElementById("currentPwd").type = e.target.checked ? "text" : "password"; });
  t2?.addEventListener("change", e => { document.getElementById("sqAnswer").type = e.target.checked ? "text" : "password"; });
  t3?.addEventListener("change", e => { document.getElementById("newPwd").type = e.target.checked ? "text" : "password"; });
  t4?.addEventListener("change", e => { document.getElementById("confirmNewPwd").type = e.target.checked ? "text" : "password"; });

  // get random security question for the current user
  async function loadSecurityQuestion() {
    try {
      const res = await fetch("/api/auth/security-question", { credentials: "include" });
      if (!res.ok) throw new Error();
      const q = await res.json();
      document.getElementById("sqText").textContent = q.question;
      document.getElementById("sqId").value = q.qid;
      document.getElementById("sqAnswer").value = "";
    } catch {
      document.getElementById("sqText").textContent = "Unable to load security question.";
    }
  }

  // change password flow (reauth + change)
  const changeForm = document.getElementById("changePwdForm");
  changeForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const pwdMsg = document.getElementById("pwdMsg");
    pwdMsg.textContent = "";

    const currentPwd = document.getElementById("currentPwd").value;
    const qid = document.getElementById("sqId").value;
    const answer = document.getElementById("sqAnswer").value;
    const newPwd = document.getElementById("newPwd").value;
    const confirmNewPwd = document.getElementById("confirmNewPwd").value;

    // quick client validation
    const ok =
      newPwd.length >= 10 &&
      /[A-Z]/.test(newPwd) &&
      /[a-z]/.test(newPwd) &&
      /[0-9]/.test(newPwd) &&
      /[^A-Za-z0-9]/.test(newPwd);
    if (!ok) {
      pwdMsg.textContent = "Password does not meet complexity rules.";
      return;
    }
    if (newPwd !== confirmNewPwd) {
      pwdMsg.textContent = "Passwords do not match.";
      return;
    }

    try {
      // reauth
      let res = await apiFetch("/api/auth/reauth", { method: "POST", body: { password: currentPwd, qid, answer } });
      if (!res.ok) {
        pwdMsg.textContent = await res.text().catch(() => "Re-authentication failed.");
        return;
      }

      // change password
      res = await apiFetch("/api/auth/change-password", { method: "POST", body: { newPassword: newPwd } });
      if (!res.ok) {
        pwdMsg.textContent = await res.text().catch(() => "Password change failed.");
        return;
      }

      pwdMsg.style.color = "green";
      pwdMsg.textContent = "Password updated.";
      // refresh next question
      await loadSecurityQuestion();
      document.getElementById("currentPwd").value = "";
      document.getElementById("newPwd").value = "";
      document.getElementById("confirmNewPwd").value = "";
      document.getElementById("sqAnswer").value = "";
      setTimeout(() => { pwdMsg.textContent = ""; pwdMsg.style.color = "#c00"; }, 3000);
    } catch (err) {
      pwdMsg.textContent = "Unable to change password.";
    }
  });

  // logout
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      const res = await apiFetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Logout failed.");
      window.location.href = "/frontend/html/login.html";
    } catch (e) {
      alert(e.message || "Unable to logout.");
    }
  });

  // load a question on first render of profile (if opened by default later)
  if (document.querySelector('.nav-item.active')?.dataset.tab === "profile") {
    loadSecurityQuestion();
  }
})();
