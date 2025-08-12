// login.js — identifier (username or email)
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
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const opts = { credentials: "include", method, headers };

  if (options.body !== undefined) {
    opts.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers["CSRF-Token"] = await getCsrfToken();
  }
  const res = await fetch(url, opts);
  if (res.status === 403) {
    const text = await res.text().catch(() => "");
    if (!options.__retried && text.includes("Invalid request token")) {
      csrfTokenCache = null;
      return apiFetch(url, { ...options, __retried: true });
    }
  }
  return res;
}

const form = document.getElementById("loginForm");
const pwdInput = document.getElementById("password");
document.getElementById("showLoginPwd").addEventListener("change", (e) => {
  pwdInput.type = e.target.checked ? "text" : "password";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("err");
  errEl.textContent = "";

  const identifier = document.getElementById("identifier").value.trim();
  const password = pwdInput.value;

  try {
    const res = await apiFetch("/api/auth/login", { method: "POST", body: { identifier, password } });
    if (!res.ok) {
      if (res.status === 423) {
        // show server's lock message if available
        const t = await res.text().catch(() => "");
        errEl.textContent = t || "Account temporarily locked. Try again later.";
      } else if (res.status === 400) {
        // keep generic to avoid leak
        errEl.textContent = "Invalid username and/or password.";
      } else {
        const t = await res.text().catch(() => "");
        errEl.textContent = t || "Login failed.";
      }
      return;
    }
    const data = await res.json().catch(() => ({}));
    sessionStorage.setItem("lastUse", data?.lastUse || "");
    window.location.href = "/frontend/html/booking.html";
  } catch (err) {
    errEl.textContent = "Something went wrong, please try again.";
  }
});
