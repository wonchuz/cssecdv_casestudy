// backend/seed.js
require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");

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

// ===== Seed Function =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log("Connected to MongoDB. Seeding data...");

  await Book.deleteMany({});
  await User.deleteMany({});

  const users = await User.insertMany([
    {
      fullName: "Alice Johnson",
      email: "alice@example.com",
      username: "alice",
      password: "password123"
    },
    {
      fullName: "Bob Smith",
      email: "bob@example.com",
      username: "bob",
      password: "mypassword"
    }
  ]);

  await Book.insertMany([
    { title: "To Kill a Mockingbird", author: "Harper Lee" },
    { title: "1984", author: "George Orwell" },
    {
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      borrowed: true,
      borrowedBy: users[0]._id // Alice has borrowed this
    }
  ]);

  console.log("✅ Database seeded with users and books");
  mongoose.connection.close();
})
.catch(err => console.error(err));
