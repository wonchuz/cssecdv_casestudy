require("dotenv").config({ path: __dirname + "/../.env" });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
// const bcrypt = require("bcrypt"); // for password checking (next time nlang)
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
  password: String,
  role: { 
    type: String, 
    enum: ["admin", "librarian", "member"], 
    default: "member" 
  }
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

// GET books borrowed by a specific user
app.get("/mybooks/:userId", async (req, res) => {
  try {
    const books = await Book.find({ borrowedBy: req.params.userId });
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch borrowed books" });
  }
});

// NOTE: Admin only has read access to transactions
// POST borrow book
app.post("/borrow/:id", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  // Validate userId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid User ID format" });
  }

  try {
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find the book
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    if (book.borrowed) {
      return res.status(400).json({ error: "Book already borrowed" });
    }

    // Borrow the book
    book.borrowed = true;
    book.borrowedBy = userId;
    await book.save();

    res.json({ message: "Book borrowed successfully", book });
  } catch (err) {
    console.error("Error borrowing book:", err);
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

// POST login
app.post("/login", async (req, res) => {
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
    const isMatch = await user.password === password;
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
        username: user.username //TODO, determine if this should be updated with the new roles
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
