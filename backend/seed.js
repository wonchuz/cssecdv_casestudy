require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const User = require("./models/User");
const Book = require("./models/Book");

// sec. qs
const STRONG_QUESTIONS = [
  { id: "q01", text: "Name of a teacher who never taught you (random person you can recall)?" },
  { id: "q02", text: "Title of the first book you disliked (use any random book)?" },
  { id: "q03", text: "Nickname you would never use (invent one)?" },
  { id: "q04", text: "Make a random phrase you can remember (e.g., 'violet-otter-cobalt')" },
  { id: "q05", text: "Street name from an imaginary address you invent?" },
  { id: "q06", text: "Random combination of three words you choose (no personal info)?" },
];

function pick(id) {
  const q = STRONG_QUESTIONS.find(x => x.id === id);
  return { qid: q.id, question: q.text };
}

async function run() {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;
  if (!mongoUrl) {
    console.error("No MONGO_URL/MONGO_URI set.");
    process.exit(1);
  }

  await mongoose.connect(mongoUrl);
  console.log("Connected. Clearing collections...");
  await Promise.all([User.deleteMany({}), Book.deleteMany({})]);

  // pre-demo users
  const users = [
    { email: "admin@example.com", role: "admin",            fullName: "Admin User",          username: "admin",  pwd: "Admin!23456",
      qa: [{...pick("q01"), answer: "violet otter cobalt"}, {...pick("q03"), answer: "carrot-plane-77"}] },
    { email: "pm@example.com",    role: "product_manager",  fullName: "Product Manager",     username: "pmgr",   pwd: "Manager!23456",
      qa: [{...pick("q02"), answer: "storm glass 221"},     {...pick("q05"), answer: "elm avenue north"}] },
    { email: "lib@example.com",   role: "librarian",     fullName: "Librarian",        username: "lib",    pwd: "Lib!234567",
      qa: [{...pick("q04"), answer: "mint-river-foam"},     {...pick("q06"), answer: "orbit violet rice"}] },
    { email: "cust@example.com",  role: "customer",         fullName: "Customer Account",    username: "cust",   pwd: "Customer!23456",
      qa: [{...pick("q01"), answer: "tulip cobalt 995"},    {...pick("q02"), answer: "sable-book-king"}] },
    // extra customer dummy users
    { email: "amy@example.com",   role: "customer",         fullName: "Amy Adams",           username: "amy",    pwd: "Amy!234567",
      qa: [{...pick("q03"), answer: "alpha-brick-02"},      {...pick("q05"), answer: "maple west road"}] },
    { email: "bob@example.com",   role: "customer",         fullName: "Bob Brown",           username: "bobby",  pwd: "Bob!234567",
      qa: [{...pick("q04"), answer: "rain-lamp-fox"},       {...pick("q06"), answer: "paper orbit rain"}] },
  ];

  const created = {};
  for (const u of users) {
    const user = new User({ email: u.email, role: u.role, fullName: u.fullName, username: u.username });
    await user.setPassword(u.pwd);
    await user.setSecurityAnswers(u.qa);
    await user.save();
    created[u.email] = user;
    console.log("Created:", u.email);
  }

  // books
  await Book.insertMany([
    { title: "To Kill a Mockingbird", author: "Harper Lee" },
    { title: "1984",                  author: "George Orwell" },
    { title: "The Great Gatsby",      author: "F. Scott Fitzgerald", borrowed: true, borrowedBy: created["cust@example.com"]._id }
  ]);

  console.log("✅ Seed complete :D");
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
