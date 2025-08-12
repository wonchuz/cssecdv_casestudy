const express = require("express");
const router = express.Router();
const User = require("../models/User"); // Assuming models are in a 'models' folder

// POST login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Compare passwords (assuming they are hashed in the DB)
    const isMatch = await user.password === password; // Consider using bcrypt for actual password hashing
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Success
    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        role: user.role // Include the role here
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;