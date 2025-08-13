const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cookieParser = require("cookie-parser");
const csrf = require("csurf");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const onFinished = require("on-finished");

const { auditLogger, requestLogger, errorLogger } = require("./winston-logger");
const userRoutes = require("./routes/userRoutes");
const bookRoutes = require("./routes/bookRoutes");
const transactionRoutes = require("./routes/transactionRoutes");

const MONGO_URL = process.env.MONGO_URL || process.env.MONGO_URI;
if (!MONGO_URL) {
  console.error("❌ Missing MONGO_URL or MONGO_URI in .env");
  process.exit(1);
}
console.log("✅ Using MONGO_URL:", MONGO_URL);

const app = express();
app.use(helmet());
app.use(cors({ origin: (o, cb) => cb(null, true), credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// req logging
app.use((req, res, next) => requestLogger(req, res, next));

// response audit logging
app.use((req, res, next) => {
  onFinished(res, () => {
    const user = req.session?.user?.username || req.session?.user?.email || null;
    auditLogger.info({
      evt: "RESP",
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      user,
    });
  });
  next();
});

// rate-limit auth endpoints (kept loose for testing; however in real cases should be limited)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// sessions
app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change_me",
    name: "sid",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000 * 60 * 60 * 8 },
    store: MongoStore.create({ mongoUrl: MONGO_URL }),
  })
);

// CSRF + token helper
app.use(csrf({ cookie: true }));
app.get("/api/csrf-token", (req, res) => res.json({ csrfToken: req.csrfToken() }));

// serve frontend
app.use("/frontend", express.static(path.join(__dirname, "../frontend")));

// routes
app.use("/api/auth", userRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/transactions", transactionRoutes);

// redirect root to the login page; since no index
app.get("/", (req, res) => {
  res.redirect("/frontend/html/login.html");
});

// 404
app.use((req, res) => res.status(404).send("Sorry, we can't find that! :("));

// error handler
app.use((err, req, res, next) => {
  errorLogger.error({
    evt: "SERVER_ERROR",
    method: req.method,
    url: req.originalUrl,
    msg: err.message,
  });
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).send("Invalid request token! :(");
  }
  res.status(500).send("Something went wrong :(");
});

if (require.main === module) {
  mongoose
    .connect(MONGO_URL)
    .then(() => {
      const port = process.env.PORT || 3000;
      app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
    })
    .catch((e) => {
      console.error("DB connection failed:", e.message);
      process.exit(1);
    });
}

module.exports = app;
