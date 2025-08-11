require("dotenv").config({ path: __dirname + "/../.env" });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ===== Connect to MongoDB =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// ===== Schemas =====
const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  username: { type: String, unique: true },
  password: String
});
const User = mongoose.model("User", userSchema);

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  borrowed: { type: Boolean, default: false },
  borrowedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
});
const Book = mongoose.model("Book", bookSchema);

// ===== Routes =====

// GET all books
app.get("/books", async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// POST borrow book
app.post("/borrow/:id", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    if (book.borrowed) {
      return res.status(400).json({ error: "Book already borrowed" });
    }

    book.borrowed = true;
    book.borrowedBy = userId;
    await book.save();

    res.json({ message: "Book borrowed successfully", book });
  } catch (err) {
    res.status(500).json({ error: "Failed to borrow book" });
  }
});

// POST return book
app.post("/return/:id", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    if (!book.borrowed || book.borrowedBy.toString() !== userId) {
      return res.status(400).json({ error: "You cannot return this book" });
    }

    book.borrowed = false;
    book.borrowedBy = null;
    await book.save();

    res.json({ message: "Book returned successfully", book });
  } catch (err) {
    res.status(500).json({ error: "Failed to return book" });
  }
});

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
