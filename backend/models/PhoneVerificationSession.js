const mongoose = require("mongoose");

const phoneVerificationSessionSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true
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
    default: "shop-signup"
  }
}, { timestamps: true });

module.exports = mongoose.model("PhoneVerificationSession", phoneVerificationSessionSchema);
