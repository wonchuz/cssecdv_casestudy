require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");

// Book schema and model
const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  reserved: { type: Boolean, default: false }
});
const Book = mongoose.model("Book", bookSchema);

// User schema and model
const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  username: { type: String, unique: true },
  password: String
});
const User = mongoose.model("User", userSchema);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log("Connected to MongoDB. Seeding data...");

  // Clear existing data
  await Book.deleteMany({});
  await User.deleteMany({});

  // Insert books
  await Book.insertMany([
    { title: "To Kill a Mockingbird", author: "Harper Lee" },
    { title: "1984", author: "George Orwell" },
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald" }
  ]);

  // Insert users
  await User.insertMany([
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

  console.log("✅ Database seeded with books and users");
  mongoose.connection.close();
})
.catch(err => console.error(err));
