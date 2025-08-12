require("dotenv").config({ path: __dirname + "/../.env" });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

// Import routes
const bookRoutes = require("./routes/bookRoutes");
const userRoutes = require("./routes/userRoutes");

// Middleware
app.use(cors());
app.use(express.json());

// ===== Connect to MongoDB =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// ===== Routes =====
app.use("/books", bookRoutes); // All routes in bookRoutes will be prefixed with /books
app.use("/auth", userRoutes);  // All routes in userRoutes will be prefixed with /auth (e.g., /auth/login)

// Optional: Basic root route
app.get("/", (req, res) => {
  res.send("Welcome to the Library API!");
});

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));