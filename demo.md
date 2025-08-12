# CS Demo Test Guide — Library App (Auth, AuthZ, Validation, Logging)

**Audience:** CS student or developer. Clear, hands‑on steps with UI flows, DevTools/Console snippets, and what to watch in logs.

---

## 0) Prerequisites & One‑time Setup

### 0.1 Clone & install

Make sure you’ve installed dependencies and set your `.env` (including `MONGO_URL`/`MONGO_URI`).

```bash
npm install
```

### 0.2 (Optional) Demo tuning knobs

If you want faster demos for password min‑age lockouts, set this in your `.env`, then restart the server:

```bash
# 60 seconds minimum password age for demo
PWD_MIN_AGE_MS=60000
```

> Default is 24 hours if `PWD_MIN_AGE_MS` is not set.

---

## 1) **Seed, then Start**, and Tail Logs

> **Important:** For this demo, **seed the database *before* starting the app**.

### 1.1 Seed demo data (run first)

From the project root:

```bash
npm run seed
```

> Re‑run the same commands any time you change models/seed data.

### 1.2 Start the API

In a terminal at the project root:

```bash
npm run dev
```

Or:

```bash
node backend/server.js
```

Wait for:

```
API listening on http://localhost:3000
```

### 1.3 Watch the audit log live

**Windows (PowerShell):**

```powershell
Get-Content .\backend\logs\audit.log -Wait
```

**macOS/Linux:**

```bash
tail -f backend/logs/audit.log
```

> **What you’ll see:** JSON log lines such as `REQ`, `RESP`, `LOGIN`, `LOGIN_FAIL`, `LOGIN_LOCKED`, `BOOK_BORROW`, `VALIDATION_FAIL`, etc.

---

## 2) Pre‑demo Accounts ✅

**Goal:** verify Admin, Product Manager, Veterinarian, and Customer accounts exist and can sign in.

Open: `http://localhost:3000/frontend/html/login.html`

**Seeded accounts** (email / username / password / role):

| Email                                         | Username | Password       | Role             |
| --------------------------------------------- | -------- | -------------- | ---------------- |
| [admin@example.com](mailto:admin@example.com) | admin    | Admin!23456    | admin            |
| [pm@example.com](mailto:pm@example.com)       | pmgr     | Manager!23456  | product\_manager |
| [lib@example.com](mailto:lib@example.com)     | lib      | Lib!234567     | librarian     |
| [cust@example.com](mailto:cust@example.com)   | cust     | Customer!23456 | customer         |
| [amy@example.com](mailto:amy@example.com)     | amy      | Amy!234567     | customer         |
| [bob@example.com](mailto:bob@example.com)     | bobby    | Bob!234567     | customer         |

**Login one at a time** (you can use **email *or* username** with the same password):

* Admin — `admin@example.com` **or** `admin` / `Admin!23456`
* Product Manager — `pm@example.com` **or** `pmgr` / `Manager!23456`
* Veterinarian — `vet@example.com` **or** `vet` / `Vet!234567`
* Customer — `cust@example.com` **or** `cust` / `Customer!23456`
* Customer (Amy) — `amy@example.com` **or** `amy` / `Amy!234567`
* Customer (Bob) — `bob@example.com` **or** `bobby` / `Bob!234567`

**UI check:** after each login, go to **Profile**. You should see your email + role.

**Logs:** in the tailing window you’ll see `LOGIN` entries.

---

## 3) Authentication (2.1)

### A) Require login for protected pages (2.1.1)

Open a **private/incognito** window (not logged in) and visit:

```
http://localhost:3000/api/books
```

**Expected:** `401 Authentication required.`

**DevTools Console (not logged in):**

```js
fetch('/api/books').then(r => r.status) // 401
```

**Logs:** `ACCESS_DENY` with `reason:"unauthenticated"`.

---

### B) Fail securely (generic error) (2.1.2 & 2.1.4)

On the login page, enter any wrong combination (e.g., `no@no.com` / `wrong`).

**Expected UI:** `Invalid username and/or password.` (generic, doesn’t reveal which field)

**DevTools Console (from login page):**

```js
// 1) Get CSRF
const { csrfToken } = await (await fetch('/api/csrf-token',{credentials:'include'})).json();
// 2) Wrong credentials
const res = await fetch('/api/auth/login', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken },
  body: JSON.stringify({ identifier: 'bad@user.com', password: 'wrong' })
});
console.log(res.status, await res.text()); // 400 + "Invalid username and/or password."
```

**Logs:** `LOGIN_FAIL`.

---

### C) Passwords are hashed (2.1.3)

Open **MongoDB Compass** (or `mongosh`) to your database. Inspect a `users` document.

* You should see `passwordHash` (bcrypt) and **no** plaintext password field.

**mongosh example** (adjust `MONGO_URL` or use Compass UI):

```bash
mongosh "<your MONGO_URL>" --eval 'db.users.findOne({}, {email:1, username:1, passwordHash:1, _id:0})'
```

---

### D) Password complexity + length — **server‑side validation** (2.1.5, 2.1.6)

Front‑end rules block bad input before hitting the server, so to see **server‑side** validation (and `VALIDATION_FAIL` in logs), post directly to the API from DevTools.

**On Register page** (`/frontend/html/register.html`) → open **Console** and run:

```js
// 1) CSRF
const { csrfToken } = await (await fetch('/api/csrf-token',{credentials:'include'})).json();
// 2) Intentionally invalid signup (bad email + weak password + invalid role)
const res = await fetch('/api/auth/signup', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken },
  body: JSON.stringify({ email: 'not-an-email', password: 'short', role: 'hacker' })
});
console.log('status:', res.status, 'body:', await res.text()); // expect 400 "Invalid input."
```

**Logs:** A line like `{"evt":"VALIDATION_FAIL","where":"users",...}`

**(Optional) Books validation from Console (logged in using admin):**
* Admin — `admin@example.com` **or** `admin` / `Admin!23456`

```js
const { csrfToken } = await (await fetch('/api/csrf-token',{credentials:'include'})).json();
const r = await fetch('/api/books', {
  method:'POST', credentials:'include',
  headers:{ 'Content-Type':'application/json', 'CSRF-Token': csrfToken },
  body: JSON.stringify({ title:'', author:123 }) // invalid on purpose
});
console.log('status:', r.status, await r.text()); // 400 "Invalid input."
```

**Logs:** `VALIDATION_FAIL` with `where:"books"`.

---

### E) Password entry is obscured (2.1.7)

On **Login** and **Register** pages, typed passwords show as dots (HTML `type="password"`). Toggle **Show password** to reveal.

---

### F) Account lockout after invalid attempts (2.1.8)

Try 5 times with a bad password for the same account.

**Console helper (on login page):**

```js
async function tryBad() {
  const { csrfToken } = await (await fetch('/api/csrf-token',{credentials:'include'})).json();
  const r = await fetch('/api/auth/login', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken },
    body: JSON.stringify({ identifier: 'admin@example.com', password: 'Wrong!123' })
  });
  return r.status;
}
for (let i=1;i<=5;i++) console.log('attempt', i, '→', await tryBad());
```

**Expected:** attempts 1–4 → `400`, attempt 5 → `423` (locked).
* Will display "Account temporarily locked. Try again later." for `admin` account.
* Should be okay after 60 secs due to temp vals (LOCK_MS) for testing in `userRoutes.js` file.
* Can also manually reset using 
```bash
npm seed
```

**Logs:** multiple `LOGIN_FAIL`, then `LOGIN_LOCKED`.

---

### G) Password reset questions randomness (2.1.9)

This app uses **security questions at signup and re‑authentication** (not a public reset flow). The catalog is designed to avoid common answers.

**UI check:** On **Register**, two *Security Questions* must be chosen; answers must be ≥ 6 chars. On **Profile → Change Password**, a **random** one of your questions is shown and must be answered to re‑authenticate.

**Logs:** incorrect answers generate `REAUTH_FAIL_QA`.

> **Note:** Because this is **not** a self‑service “forgot password” flow, you can mark the traditional reset sub‑requirement as **N/A**, while still demonstrating the randomness requirement via the re‑auth step.

---

### H) Prevent password re‑use (2.1.10)

**Flow:** Login → Profile → Change Password.

1. Enter **current password** + answer the **security question** (re‑auth happens automatically).
2. Try to set the **same** password you’re currently using **or** one of the last 5.

**Expected UI/API:** Failure with a clear message like `You cannot reuse your current password.` (or `You cannot reuse a recent password.`)

**Logs:** `PWD_CHANGE_FAIL` with `code` indicating reuse.

---

### I) Minimum password age (2.1.11)

**Flow:** Change your password once (success). Immediately attempt to change again.

**Expected:** Failure with message `Password changed too recently...`

**Demo tip:** If you set `PWD_MIN_AGE_MS=60000`, retry within 60s to trigger it.

**Logs:** `PWD_CHANGE_FAIL` with code `PWD_MIN_AGE`.

---

### J) Last account use on next login (2.1.12)

Log out, then log in again.

**Expected:** API response includes `lastUse` (last login timestamp). The UI stores/displays it.

**Network tab:** Inspect `POST /api/auth/login` → Response JSON contains `lastUse`.

---

### K) Re‑authenticate before critical actions (2.1.13)

Try to call **Change Password** API **without** a fresh re‑auth:

**Console (while logged in, but before reauth):**

```js
const { csrfToken } = await (await fetch('/api/csrf-token',{credentials:'include'})).json();
const r = await fetch('/api/auth/change-password',{
  method:'POST', credentials:'include',
  headers:{'Content-Type':'application/json','CSRF-Token':csrfToken},
  body: JSON.stringify({ newPassword:'NewPass!23456' })
});
console.log(r.status, await r.text()); // 401 "Please re-authenticate to continue."
```

**UI flow:** On Profile, enter current password + answer the security question (you’ll see a confirmation), then change the password → **success**.

**Logs:** `PWD_CHANGE` on success, `REAUTH_FAIL_QA` on wrong answer.

---

## 4) Authorization / Access Control (2.2)

### A) Single site‑wide authorization gate (2.2.1)

You already confirmed `/api/books` returns `401` when not logged in — that’s the global `requireAuth` middleware.

### B) Fail securely — role restrictions (2.2.2)

**Goal:** Only **Admin** and **Product Manager** can create books.

**UI check:** As **Customer**, the **Add Book** form is hidden.

**API check (Customer, via Console):**

```js
const { csrfToken } = await (await fetch('/api/csrf-token',{credentials:'include'})).json();
const r = await fetch('/api/books', {
  method:'POST', credentials:'include',
  headers:{'Content-Type':'application/json','CSRF-Token':csrfToken},
  body: JSON.stringify({ title:'Forbidden by role', author:'Test' })
});
console.log(r.status, await r.text());
// Expected: 403 "Forbidden." + audit: ACCESS_DENY (if server-side role gate is enabled)
```

> **If you see 201 instead of 403:** your backend route is currently open to any authenticated user. Apply the role middleware (e.g., wrap `POST /api/books` with `allowRoles('admin','product_manager')`) and retry.

### C) Enforce business rules (2.2.3)

* As **Customer A**, click **Borrow** → book becomes **Borrowed**. **Logs:** `BOOK_BORROW`.
* As **Customer B** (different browser/incognito), try to borrow the **same** book → **409** `Book already borrowed.` **Logs:** `BOOK_BORROW_FAIL` with `reason:"already_borrowed"`.
* Try to **return** a book that you didn’t borrow (and you’re not Admin) → **403** `Forbidden.` **Logs:** `BOOK_RETURN_FAIL` with `reason:"forbidden"`.

---

## 5) Data Validation (2.3)

### A) Validation failures are rejected (2.3.1)

Already shown in **3.D** (signup) and the optional Books test — both return `400 Invalid input.` and log `VALIDATION_FAIL`.

### B) Validate length & range (2.3.2, 2.3.3)

**Long title test (logged in as Admin/PM):**

```js
const { csrfToken } = await (await fetch('/api/csrf-token',{credentials:'include'})).json();
const long = 'x'.repeat(300);
const r = await fetch('/api/books', {
  method:'POST', credentials:'include',
  headers:{'Content-Type':'application/json','CSRF-Token':csrfToken},
  body: JSON.stringify({ title: long, author: 'A' })
});
console.log(r.status, await r.text()); // 400 "Invalid input."
```

**Logs:** `VALIDATION_FAIL` with `where:"books"` and details about length.

**Invalid role on signup:** see **3.D** (body with `role:"hacker"`).

---

## 6) Error Handling & Logging (2.4)

### A) No stack traces to users (2.4.1)

Visit a non‑existent page:

```
http://localhost:3000/does-not-exist
```

**Expected:** simple 404 message without stack trace.

### B) Generic errors / custom pages (2.4.2)

You’ve seen generic `401/403/404/500` text responses. That satisfies this requirement.

### C) Log success **and** failures (2.4.3)

While performing logins, logouts, borrow/return, and validations, your **audit log** shows: `LOGIN`, `LOGIN_FAIL`, `LOGIN_LOCKED`, `BOOK_CREATE`, `BOOK_BORROW`, `BOOK_RETURN`, `VALIDATION_FAIL`, `RESP`, etc.

### D) Restrict log access to Admins (2.4.4)

* As **Admin**: open `http://localhost:3000/api/auth/logs` → **you can view logs**.
* As **Customer**: same URL → **403 Forbidden**.

### E) Specifically log the bad stuff (2.4.5–2.4.7)

* **Validation failures:** `VALIDATION_FAIL`
* **Authentication failures:** `LOGIN_FAIL`; lockouts: `LOGIN_LOCKED`
* **Access control failures:** `ACCESS_DENY`, `BOOK_RETURN_FAIL`, etc.

---

## 7) Final Sign‑off Checklist

Tick each box once you’ve observed the expected UI/API result **and** the corresponding audit log entry:

* [ ] 2.1.1 `401` on protected routes while unauthenticated (`ACCESS_DENY` in logs)
* [ ] 2.1.2/2.1.4 Generic login error (`LOGIN_FAIL` in logs)
* [ ] 2.1.3 Passwords stored hashed (verified in DB)
* [ ] 2.1.5/2.1.6 Server‑side complexity/length rejection (`VALIDATION_FAIL`)
* [ ] 2.1.7 Password field obscured by default
* [ ] 2.1.8 Lockout after N attempts (`LOGIN_LOCKED`)
* [ ] 2.1.9 Security questions present; incorrect answers rejected (`REAUTH_FAIL_QA`)
* [ ] 2.1.10 Reuse blocked (`PWD_CHANGE_FAIL` with reuse code)
* [ ] 2.1.11 Min password age enforced (`PWD_MIN_AGE`)
* [ ] 2.1.12 Last use shown on next login (`lastUse` in response)
* [ ] 2.1.13 Re‑auth required for password change (`401` without reauth; `PWD_CHANGE` after)
* [ ] 2.2.1 Global `requireAuth` gate
* [ ] 2.2.2 Role‑based create‑book restriction (**403** for Customer; **201** for Admin/PM)
* [ ] 2.2.3 Business rules: borrow, double‑borrow conflict (`409`), unauthorized return (`403`)
* [ ] 2.3.1–2.3.3 Validation rejects bad length/range (logs `VALIDATION_FAIL`)
* [ ] 2.4.1–2.4.2 Generic errors; no stack traces in responses
* [ ] 2.4.3–2.4.7 Audit logs include successes and failures; logs restricted to Admin

---

## Appendix: Handy Console Snippets

**Get CSRF (reusable):**

```js
const { csrfToken } = await (await fetch('/api/csrf-token',{credentials:'include'})).json();
```

**Generic JSON POST:**

```js
const r = await fetch('/api/path', {
  method:'POST', credentials:'include',
  headers:{ 'Content-Type':'application/json','CSRF-Token':csrfToken },
  body: JSON.stringify({ /* payload */ })
});
console.log(r.status, await r.text());
```

**Tail logs (macOS/Linux):** `tail -f backend/logs/audit.log`

**Tail logs (Windows PowerShell):** `Get-Content .\\backend\\logs\\audit.log -Wait`
