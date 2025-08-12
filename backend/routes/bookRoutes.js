const express = require("express");
const router = express.Router();
const Book = require("../models/Book");
const User = require("../models/User"); 
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

// GET all books
router.get("/", async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// GET books borrowed by a specific user
router.get("/mybooks/:userId", async (req, res) => {
  try {
    const books = await Book.find({ borrowedBy: req.params.userId });
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch borrowed books" });
  }
});

// POST borrow book
router.post("/borrow/:id", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid User ID format" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    if (book.borrowed) {
      return res.status(400).json({ error: "Book already borrowed" });
    }

    // Update book status
    book.borrowed = true;
    book.borrowedBy = userId;
    await book.save();

    // Create a new borrow transaction record
    const transaction = new Transaction({
      book: book._id,
      user: userId,
      type: "borrow"
    });
    await transaction.save();

    res.json({ message: "Book borrowed successfully", book, transaction });
  } catch (err) {
    console.error("Error borrowing book:", err);
    res.status(500).json({ error: "Failed to borrow book" });
  }
});

// POST return book
router.post("/return/:id", async (req, res) => {
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

    // Update book status
    book.borrowed = false;
    book.borrowedBy = null;
    await book.save();

    // Create a new return transaction record
    const transaction = new Transaction({
      book: book._id,
      user: userId,
      type: "return"
    });
    await transaction.save();

    res.json({ message: "Book returned successfully", book, transaction });
  } catch (err) {
    res.status(500).json({ error: "Failed to return book" });
  }
});

module.exports = router;