const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { auditLogger } = require("../winston-logger");
const { requireAuth, allowRoles } = require("../authz");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60 * 1000; // short for testing

// ===== Strong security question catalog (IDs must match frontend) =====
const STRONG_QUESTIONS = [
  { id: "q01", text: "Name of a teacher who never taught you (random person you can recall)?" },
  { id: "q02", text: "Title of the first book you disliked (use any random book)?" },
  { id: "q03", text: "Nickname you would never use (invent one)?" },
  { id: "q04", text: "Make a random phrase you can remember (e.g., 'violet-otter-cobalt')" },
  { id: "q05", text: "Street name from an imaginary address you invent?" },
  { id: "q06", text: "Random combination of three words you choose (no personal info)?" },
];

// --- helper: write a single VALIDATION_FAIL entry + return 400
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    auditLogger.warn({ evt: "VALIDATION_FAIL", where: "users", details: errors.array(), ip: req.ip });
    return res.status(400).send("Invalid input.");
  }
  next();
}

// Public helpers for UI
router.get("/security-questions", (req, res) => {
  res.json(STRONG_QUESTIONS);
});

router.get("/security-question", requireAuth, async (req, res) => {
  const user = await User.findById(req.session.user.id).lean();
  if (!user?.securityQuestions?.length) return res.status(404).send("No security questions set.");
  const pick = user.securityQuestions[Math.floor(Math.random() * user.securityQuestions.length)];
  res.json({ qid: pick.qid, question: pick.question });
});

// ===== Signup =====
router.post(
  "/signup",
  body("email").isEmail().normalizeEmail({ gmail_remove_dots: false }).trim(),
  body("username").optional({ checkFalsy: true }).isString().isLength({ min: 3, max: 30 }).matches(/^[a-z0-9._-]+$/),
  body("fullName").optional({ checkFalsy: true }).isString().isLength({ max: 100 }),
  body("password").isLength({ min: 10 }).matches(/[A-Z]/).matches(/[a-z]/).matches(/[0-9]/).matches(/[^A-Za-z0-9]/),
  body("role").optional().isIn(["admin", "product_manager", "customer", "librarian"]),
  body("security").isArray({ min: 2, max: 2 }),
  body("security.*.qid").isString(),
  body("security.*.answer").isString().isLength({ min: 6 }),
  validate,
  async (req, res) => {
    try {
      const { email, username, fullName, password, role, security } = req.body;

      const qmap = new Map(STRONG_QUESTIONS.map(q => [q.id, q.text]));
      const answers = security.map(s => {
        const text = qmap.get(s.qid);
        if (!text) throw new Error("Invalid security question.");
        return { qid: s.qid, question: text, answer: s.answer };
      });

      if (await User.findOne({ email })) {
        auditLogger.warn({ evt: "SIGNUP_FAIL", reason: "duplicate_email", email, ip: req.ip });
        return res.status(400).send("Could not create account.");
      }
      if (username && await User.findOne({ username })) {
        auditLogger.warn({ evt: "SIGNUP_FAIL", reason: "duplicate_username", username, ip: req.ip });
        return res.status(400).send("Could not create account.");
      }

      const user = new User({ email, role, fullName, username });
      await user.setPassword(password);
      await user.setSecurityAnswers(answers);
      await user.save();

      auditLogger.info({ evt: "SIGNUP", email, username, ip: req.ip });
      res.status(201).send("Account created.");
    } catch (e) {
      auditLogger.warn({ evt: "SIGNUP_FAIL", email: req.body.email, msg: e.message, ip: req.ip });
      res.status(400).send("Could not create account.");
    }
  }
);

// ===== Login with username OR email =====
router.post(
  "/login",
  body("identifier").isString().trim().isLength({ min: 3 }),
  body("password").isString().isLength({ min: 1 }),
  validate,
  async (req, res) => {
    const { identifier, password } = req.body;

    let user = await User.findOne({ username: identifier.toLowerCase() });
    if (!user && identifier.includes("@")) {
      user = await User.findOne({ email: identifier.toLowerCase() });
    }

    if (!user) {
      auditLogger.warn({ evt: "LOGIN_FAIL", identifier });
      return res.status(400).send("Invalid username and/or password.");
    }

    if (user.isLocked) {
      auditLogger.warn({ evt: "LOGIN_LOCKED", id: user._id.toString(), identifier });
      return res.status(423).send("Account temporarily locked. Try again later.");
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_MS);
        user.loginAttempts = 0;
        await user.save();
        auditLogger.warn({ evt: "LOGIN_LOCKED", id: user._id.toString(), identifier });
        return res.status(423).send("Account temporarily locked. Try again later.");
      }

      await user.save();
      auditLogger.warn({ evt: "LOGIN_FAIL", id: user._id.toString(), identifier });
      return res.status(400).send("Invalid username and/or password.");
    }

    const previous = user.lastLoginAt;
    user.lastLoginSuccess = true;
    user.lastLoginAt = new Date();
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    req.session.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      username: user.username,
      fullName: user.fullName,
      lastLoginAt: previous
    };

    auditLogger.info({ evt: "LOGIN", id: user._id.toString(), username: user.username, email: user.email });
    res.json({ message: "Logged in.", lastUse: previous ? previous.toISOString() : null });
  }
);

// Who am I
router.get("/me", requireAuth, async (req, res) => {
  res.json(req.session.user);
});

// ===== Re-auth (password + one security answer) =====
router.post(
  "/reauth",
  requireAuth,
  body("password").isString().isLength({ min: 1 }),
  body("qid").isString(),
  body("answer").isString().isLength({ min: 1 }),
  validate,
  async (req, res) => {
    const user = await User.findById(req.session.user.id);

    const okPwd = await user.comparePassword(req.body.password);
    if (!okPwd) return res.status(400).send("Invalid credentials.");

    const okQA = await user.verifySecurityAnswer(req.body.qid, req.body.answer);
    if (!okQA) {
      auditLogger.warn({ evt: "REAUTH_FAIL_QA", id: user._id.toString() });
      return res.status(400).send("Security answer incorrect.");
    }

    req.session.reauthAt = Date.now();
    res.send("Re-authenticated.");
  }
);

// ===== Change password (with detailed error messages) =====
router.post(
  "/change-password",
  requireAuth,
  // Keep the validator so complexity fails are caught here
  body("newPassword")
    .isLength({ min: 10 })
    .matches(/[A-Z]/)
    .matches(/[a-z]/)
    .matches(/[0-9]/)
    .matches(/[^A-Za-z0-9]/),
  async (req, res) => {
    // --- custom validation handler so we can return a friendly message
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      auditLogger.warn({
        evt: "VALIDATION_FAIL",
        where: "users/change-password",
        details: errors.array(),
        ip: req.ip
      });
      return res
        .status(400)
        .send("Password does not meet complexity rules (min 10 chars, upper, lower, number, special).");
    }

    try {
      if (!req.session.reauthAt || Date.now() - req.session.reauthAt > 5 * 60 * 1000) {
        return res.status(401).send("Please re-authenticate to continue.");
      }

      const user = await User.findById(req.session.user.id);

      // setPassword can throw with codes: PWD_MIN_AGE, PWD_REUSE_CURRENT, PWD_REUSE_HISTORY
      await user.setPassword(req.body.newPassword);
      await user.save();

      req.session.reauthAt = null;
      auditLogger.info({ evt: "PWD_CHANGE", id: user._id.toString(), ip: req.ip });
      res.send("Password updated.");
    } catch (e) {
      // Map internal codes to clear messages for the UI
      let msg = "Could not update password.";
      switch (e.code) {
        case "PWD_MIN_AGE":
          msg = "Password changed too recently. Please wait before changing it again.";
          break;
        case "PWD_REUSE_CURRENT":
          msg = "You cannot reuse your current password.";
          break;
        case "PWD_REUSE_HISTORY":
          msg = "You cannot reuse a recent password. Choose a brand-new one.";
          break;
        default:
          if (e.message) msg = e.message;
      }

      auditLogger.warn({
        evt: "PWD_CHANGE_FAIL",
        id: req.session.user.id,
        code: e.code || null,
        msg: e.message,
        ip: req.ip
      });
      res.status(400).send(msg);
    }
  }
);

// Logout
router.post("/logout", requireAuth, (req, res) => {
  const uid = req.session.user?.email;
  req.session.destroy(() => {});
  auditLogger.info({ evt: "LOGOUT", by: uid || "unknown", ip: req.ip });
  res.send("Logged out.");
});

// Admin-only log viewer
router.get("/logs", allowRoles("admin"), (req, res) => {
  const logPath = path.resolve(__dirname, "../logs/audit.log");
  try {
    const data = fs.readFileSync(logPath, "utf8");
    res.type("text/plain").send(data);
  } catch {
    res.type("text/plain").send("");
  }
});

module.exports = router;
