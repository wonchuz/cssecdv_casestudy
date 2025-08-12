// backend/seed.js
require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");

// ===== Import Schemas =====
const User = require("./models/User");
const Book = require("./models/Book");
const Transaction = require("./models/Transaction");

// ===== Seed Function =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log("Connected to MongoDB. Seeding data...");

  await Book.deleteMany({});
  await User.deleteMany({});
  await Transaction.deleteMany({});

  const users = await User.insertMany([
    {
      fullName: "Alice Johnson",
      email: "alice@example.com",
      username: "alice",
      password: "password123",
      role: "member"
    },
    {
      fullName: "Bob Smith",
      email: "bob@example.com",
      username: "bob",
      password: "mypassword",
      role: "member"
    },
    {
      fullName: "Jane Doe",
      email: "jane@example.com",
      username: "jane",
      password: "mypassword123",
      role: "admin"
    }
  ]);

  await Book.insertMany([
    { title: "To Kill a Mockingbird", author: "Harper Lee" },
    { title: "1984", author: "George Orwell" },
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald"}
  ]);

  console.log("✅ Database seeded with users and books");
  mongoose.connection.close();
})
.catch(err => console.error(err));