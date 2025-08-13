const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const PASSWORD_HISTORY = 5;                         // prevent reuse (last N)
const PWD_MIN_AGE_MS = parseInt(process.env.PWD_MIN_AGE_MS || "", 10) || (24 * 60 * 60 * 1000);

const SecurityQA = new mongoose.Schema({
  qid:        { type: String, required: true },     // stable ID for the question
  question:   { type: String, required: true },     // text (for display / auditing)
  answerHash: { type: String, required: true },     // bcrypt hash of the answer
}, { _id: false });

const schema = new mongoose.Schema({
  // Identity
  email:    { type: String, unique: true, index: true, required: true, lowercase: true, trim: true },
  username: {
    type: String,
    unique: true,
    sparse: true,                                    // allows null/undefined
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-z0-9._-]+$/
  },
  fullName: { type: String, trim: true, maxlength: 100 },

  // Auth & security
  passwordHash:      { type: String, required: true },
  role:              { type: String, enum: ["admin","product_manager","customer","librarian"], default: "customer" },
  loginAttempts:     { type: Number, default: 0 },
  lockUntil:         { type: Date, default: null },
  lastLoginAt:       { type: Date, default: null },
  lastLoginSuccess:  { type: Boolean, default: null },
  passwordChangedAt: { type: Date, default: null },
  passwordHistory:   [{ hash: String, changedAt: Date }],
  securityQuestions: [SecurityQA],                   // two hashed answers required at signup
}, { timestamps: true });

schema.methods.comparePassword = async function(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Normalize answers before hashing/comparing (trim only — user may intentionally use case/special chars)
function normAnswer(a) {
  return String(a || "").trim();
}

schema.methods.setSecurityAnswers = async function(answers /* [{qid, question, answer}] */) {
  if (!Array.isArray(answers) || answers.length < 2) {
    const err = new Error("Two security answers are required.");
    err.code = "QA_REQUIRED";
    throw err;
  }
  const BAD_ANS = ["the bible", "password", "unknown", "i dont know", "idk"];

  const saltRounds = 12;
  const out = [];
  for (const item of answers) {
    const qid = String(item.qid || "").trim();
    const qtext = String(item.question || "").trim();
    const ans = normAnswer(item.answer);

    if (!qid || !qtext || ans.length < 6) {
      const err = new Error("Security answers must be at least 6 characters.");
      err.code = "QA_WEAK";
      throw err;
    }
    const low = ans.toLowerCase();
    if (BAD_ANS.includes(low)) {
      const err = new Error("Security answer too common. Use a random phrase.");
      err.code = "QA_COMMON";
      throw err;
    }

    const hash = await bcrypt.hash(ans, saltRounds);
    out.push({ qid, question: qtext, answerHash: hash });
  }
  this.securityQuestions = out.slice(0, 2);
};

schema.methods.verifySecurityAnswer = async function(qid, answerPlain) {
  const target = this.securityQuestions?.find(q => q.qid === qid);
  if (!target) return false;
  return bcrypt.compare(normAnswer(answerPlain), target.answerHash);
};

schema.methods.setPassword = async function setPassword(plain) {
  const saltRounds = 12;

  // 1) Prevent reusing *current* password
  if (this.passwordHash && bcrypt.compareSync(plain, this.passwordHash)) {
    const err = new Error("Cannot reuse the current password.");
    err.code = "PWD_REUSE_CURRENT";
    throw err;
  }

  // 2) Prevent reusing any recent password
  if (this.passwordHistory?.some(h => bcrypt.compareSync(plain, h.hash))) {
    const err = new Error("Cannot reuse a recent password.");
    err.code = "PWD_REUSE_HISTORY";
    throw err;
  }

  // 3) Enforce minimum password age
  if (this.passwordChangedAt && (Date.now() - this.passwordChangedAt.getTime()) < PWD_MIN_AGE_MS) {
    const err = new Error("Password changed too recently.");
    err.code = "PWD_MIN_AGE";
    throw err;
  }

  // 4) Rotate and save
  const newHash = await bcrypt.hash(plain, saltRounds);

  if (this.passwordHash) {
    this.passwordHistory = [
      { hash: this.passwordHash, changedAt: new Date() },
      ...(this.passwordHistory || [])
    ].slice(0, PASSWORD_HISTORY);
  }

  this.passwordHash = newHash;
  this.passwordChangedAt = new Date();
};

schema.virtual("isLocked").get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

module.exports = mongoose.model("User", schema);
