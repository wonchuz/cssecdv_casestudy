// Borrow a book
app.post("/borrow/:bookId", async (req, res) => {
  const { userId } = req.body; // You’d normally get this from login/session
  const { bookId } = req.params;

  const book = await Book.findById(bookId);
  if (!book) return res.status(404).send("Book not found");
  if (book.borrowed) return res.status(400).send("Book already borrowed");

  book.borrowed = true;
  book.borrowedBy = userId;
  await book.save();

  res.send("Book borrowed successfully");
});

// Return a book
app.post("/return/:bookId", async (req, res) => {
  const { bookId } = req.params;

  const book = await Book.findById(bookId);
  if (!book) return res.status(404).send("Book not found");
  if (!book.borrowed) return res.status(400).send("Book is not borrowed");

  book.borrowed = false;
  book.borrowedBy = null;
  await book.save();

  res.send("Book returned successfully");
});

// Get books borrowed by a user
app.get("/mybooks/:userId", async (req, res) => {
  const books = await Book.find({ borrowedBy: req.params.userId });
  res.json(books);
});
