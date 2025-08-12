const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  username: { type: String, unique: true },
  password: String, // In a real app, use bcrypt to hash passwords
  role: {
    type: String,
    enum: ["admin", "librarian", "member"],
    default: "member"
  }
});

module.exports = mongoose.model("User", userSchema);