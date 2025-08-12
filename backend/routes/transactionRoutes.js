const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");

// GET all transactions (read-only)
router.get("/", async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate("book")
            .populate("user");
        res.json(transactions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
});

module.exports = router;