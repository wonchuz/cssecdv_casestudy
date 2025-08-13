// signup with username + two security questions
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

// populate strong questions (fallback if API not available)
async function loadQuestions() {
  try {
    const res = await fetch("/api/auth/security-questions", { credentials: "include" });
    if (!res.ok) throw new Error("no api");
    const list = await res.json();
    renderQuestions(list);
  } catch {
    renderQuestions([
      { id: "q01", text: "Random teacher name?" },
      { id: "q02", text: "First book you disliked?" },
      { id: "q03", text: "A nickname you never use?" },
      { id: "q04", text: "Random phrase (3 words)?" },
      { id: "q05", text: "Imaginary street name?" },
      { id: "q06", text: "Three random words?" }
    ]);
  }
}

function renderQuestions(list) {
  const q1 = document.getElementById("q1");
  const q2 = document.getElementById("q2");
  q1.innerHTML = "";
  q2.innerHTML = "";
  list.forEach(q => {
    const o1 = document.createElement("option"); o1.value = q.id; o1.textContent = q.text; q1.appendChild(o1);
    const o2 = document.createElement("option"); o2.value = q.id; o2.textContent = q.text; q2.appendChild(o2);
  });
  if (q2.options.length > 1) q2.selectedIndex = 1; // different default
}
loadQuestions();

const form = document.getElementById("signupForm");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirm-password");

// live rule feedback
passwordInput.addEventListener("input", () => showErrors(passwordInput.value));
confirmInput.addEventListener("input", () => showMatchMessage(passwordInput.value, confirmInput.value));

// toggles (below fields)
document.getElementById("showSignupPwd").addEventListener("change", e => {
  passwordInput.type = e.target.checked ? "text" : "password";
});
document.getElementById("showSignupConfirmPwd").addEventListener("change", e => {
  confirmInput.type = e.target.checked ? "text" : "password";
});
document.getElementById("showA1").addEventListener("change", e => {
  document.getElementById("a1").type = e.target.checked ? "text" : "password";
});
document.getElementById("showA2").addEventListener("change", e => {
  document.getElementById("a2").type = e.target.checked ? "text" : "password";
});

const rules = {
  length: document.getElementById("length"),
  uppercase: document.getElementById("uppercase"),
  lowercase: document.getElementById("lowercase"),
  number: document.getElementById("number"),
  special: document.getElementById("special")
};
const matchMessage = document.getElementById("matchMessage");

function showErrors(password) {
  rules.length.style.display = password.length >= 10 ? "none" : "block";
  rules.uppercase.style.display = /[A-Z]/.test(password) ? "none" : "block";
  rules.lowercase.style.display = /[a-z]/.test(password) ? "none" : "block";
  rules.number.style.display = /\d/.test(password) ? "none" : "block";
  rules.special.style.display = /[^A-Za-z0-9]/.test(password) ? "none" : "block";
}

function showMatchMessage(password, confirm) {
  if (password && confirm && password !== confirm) {
    matchMessage.style.display = "block";
    matchMessage.className = "invalid";
  } else {
    matchMessage.style.display = "none";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("signupMsg").textContent = "";

  const fullName = document.getElementById("fullName").value.trim();
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = passwordInput.value;
  const confirm = confirmInput.value;
  const role = document.getElementById("role").value;

  const q1 = document.getElementById("q1").value;
  const q2 = document.getElementById("q2").value;
  const a1 = document.getElementById("a1").value.trim();
  const a2 = document.getElementById("a2").value.trim();

  showErrors(password);
  showMatchMessage(password, confirm);

  if (password !== confirm) return;
  if (q1 === q2) {
    document.getElementById("signupMsg").textContent = "Please choose two different questions.";
    return;
  }
  if (a1.length < 6 || a2.length < 6) {
    document.getElementById("signupMsg").textContent = "Answers must be at least 6 characters.";
    return;
  }

  try {
    const res = await apiFetch("/api/auth/signup", {
      method: "POST",
      body: {
        fullName, username, email, password, role,
        security: [
          { qid: q1, answer: a1 },
          { qid: q2, answer: a2 }
        ]
      }
    });

    if (!res.ok) {
      document.getElementById("signupMsg").textContent = "Could not create account.";
      return;
    }

    alert("Account created. Please log in.");
    window.location.href = "/frontend/html/login.html";
  } catch {
    document.getElementById("signupMsg").textContent = "Something went wrong.";
  }
});
