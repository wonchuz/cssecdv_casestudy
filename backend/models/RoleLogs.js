const mongoose = require("mongoose");

const roleLogSchema = new mongoose.Schema({
  // The user whose role was changed
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // The admin who performed the role change
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // The previous role of the user
  oldRole: {
    type: String,
    required: true,
    enum: ["admin", "librarian", "member"]
  },
  // The new role of the user
  newRole: {
    type: String,
    required: true,
    enum: ["admin", "librarian", "member"]
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("RoleLog", roleLogSchema);