const crypto = require("crypto");

function generateOtp(length = 6) {
  const digits = [];

  while (digits.length < length) {
    digits.push(String(crypto.randomInt(0, 10)));
  }

  return digits.join("");
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function generateResetToken() {
  return crypto.randomBytes(24).toString("hex");
}

module.exports = {
  generateOtp,
  generateResetToken,
  hashValue
};
