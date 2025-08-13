const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title:  { type: String, required: true, trim: true, maxlength: 200 },
    author: { type: String, required: true, trim: true, maxlength: 200 },
    borrowed:   { type: Boolean, default: false },
    borrowedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);
