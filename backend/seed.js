require("dotenv").config();
const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  reserved: { type: Boolean, default: false }
});
const Book = mongoose.model("Book", bookSchema);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log("Connected to MongoDB. Seeding data...");

  await Book.deleteMany({});

  await Book.insertMany([
    { title: "To Kill a Mockingbird", author: "Harper Lee" },
    { title: "1984", author: "George Orwell" },
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald" }
  ]);

  console.log("✅ Database seeded");
  mongoose.connection.close();
})
.catch(err => console.error(err));
