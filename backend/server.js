const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const dataFile = path.join(__dirname, "books.json");

app.use(cors());
app.use(express.json());

// Get all books
app.get("/books", (req, res) => {
    try {
        const books = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
        res.json(books);
    } catch (err) {
        res.status(500).json({ error: "Could not read books data" });
    }
});

// Reserve a book
app.post("/reserve/:id", (req, res) => {
    try {
        const books = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
        const bookId = parseInt(req.params.id);
        const book = books.find(b => b.id === bookId);

        if (!book) return res.status(404).json({ error: "Book not found" });
        if (book.reserved) return res.status(400).json({ error: "Book already reserved" });

        book.reserved = true;
        fs.writeFileSync(dataFile, JSON.stringify(books, null, 4));
        res.json({ message: "Book reserved successfully", book });
    } catch (err) {
        res.status(500).json({ error: "Could not reserve book" });
    }
});

app.listen(3000, () => {
    console.log("✅ Server running at http://localhost:3000");
});
