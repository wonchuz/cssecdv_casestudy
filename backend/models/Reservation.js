const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reservedAt: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ["pending", "borrowed", "returned", "cancelled"], 
      default: "pending" 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reservation", reservationSchema);