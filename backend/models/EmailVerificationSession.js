const mongoose = require("mongoose");

const emailVerificationSessionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otpHash: {
    type: String,
    required: true
  },
  otpExpiresAt: {
    type: Date,
    required: true
  },
  verifiedAt: Date,
  attempts: {
    type: Number,
    default: 0
  },
  lastSentAt: {
    type: Date,
    default: Date.now
  },
  consumedAt: Date,
  purpose: {
    type: String,
    default: "signup"
  }
}, { timestamps: true });

emailVerificationSessionSchema.index({ email: 1 }, { unique: true });
emailVerificationSessionSchema.index({ verifiedAt: 1 });
emailVerificationSessionSchema.index({ lastSentAt: 1 });

module.exports = mongoose.model("EmailVerificationSession", emailVerificationSessionSchema);
