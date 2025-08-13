const express = require("express");
const { body, param, validationResult } = require("express-validator");
const { requireAuth, allowRoles } = require("../authz");
const Book = require("../models/Book");
const Transaction = require("../models/Transaction");
const { auditLogger } = require("../winston-logger");

const router = express.Router();

// All book routes require auth
router.use(requireAuth);

// helper: log validation failures
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    auditLogger.warn({
      evt: "VALIDATION_FAIL",
      where: "books",
      details: errors.array(),
      ip: req.ip,
    });
    return res.status(400).send("Invalid input.");
  }
  next();
}

// Create book — ADMIN or Librarian only
router.post(
  "/",
  allowRoles("admin", "librarian"),
  body("title").isString().trim().isLength({ min: 1, max: 200 }),
  body("author").isString().trim().isLength({ min: 1, max: 200 }),
  validate,
  async (req, res, next) => {
    try {
      const b = await Book.create({
        title: req.body.title,
        author: req.body.author,
      });
      auditLogger.info({
        evt: "BOOK_CREATE",
        by: req.session.user.username || req.session.user.email,
        id: b._id.toString(),
        ip: req.ip,
      });
      res.status(201).json(b);
    } catch (err) {
      next(err);
    }
  }
);

// List all books
router.get("/", async (req, res, next) => {
  try {
    const books = await Book.find().lean();
    res.json(books);
  } catch (err) {
    next(err);
  }
});

// List current user's borrowed books
router.get("/mine", async (req, res, next) => {
  try {
    const uid = req.session.user.id;
    const books = await Book.find({ borrowed: true, borrowedBy: uid }).lean();
    res.json(books);
  } catch (err) {
    next(err);
  }
});

// Borrow
router.post(
  "/:id/borrow",
  param("id").isMongoId(),
  validate,
  async (req, res, next) => {
    try {
      const b = await Book.findById(req.params.id);
      if (!b) return res.status(404).send("Not found.");
      if (b.borrowed) {
        auditLogger.warn({
          evt: "BOOK_BORROW_FAIL",
          reason: "already_borrowed",
          id: b._id.toString(),
          ip: req.ip,
        });
        return res.status(409).send("Book already borrowed.");
      }
      b.borrowed = true;
      b.borrowedBy = req.session.user.id;
      await b.save();
      
      const transaction = new Transaction({
        book: b._id,
        user: req.session.user.id,
        type: "borrow",
      });
      await transaction.save();

      auditLogger.info({
        evt: "BOOK_BORROW",
        id: b._id.toString(),
        by: req.session.user.username || req.session.user.email,
        ip: req.ip,
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

// Return (borrower or admin)
router.post(
  "/:id/return",
  param("id").isMongoId(),
  validate,
  async (req, res, next) => {
    try {
      const b = await Book.findById(req.params.id);
      if (!b) return res.status(404).send("Not found.");

      const user = req.session.user || {};
      const isLibrarian = ["librarian"].includes(user.role);
      const borrowedBy = b.borrowedBy;

      if (!b.borrowed || !isLibrarian) {
        auditLogger.warn({
          evt: "BOOK_RETURN_FAIL",
          reason: "forbidden",
          id: b._id.toString(),
          ip: req.ip,
        });
        return res.status(403).send("Forbidden.");
      }
      b.borrowed = false;
      b.borrowedBy = null;
      await b.save();

      const transaction = new Transaction({
        book: b._id,
        user: borrowedBy,
        type: "return",
        librarian: req.session.user.id
      });
      await transaction.save();

      auditLogger.info({
        evt: "BOOK_RETURN",
        id: b._id.toString(),
        by: user.username || user.email,
        role: user.role,
        ip: req.ip,
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
