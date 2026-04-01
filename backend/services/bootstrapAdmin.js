const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const name = process.env.ADMIN_NAME?.trim() || "PressKardu Admin";

  if (!email || !password) {
    return;
  }

  const existingAdmin = await User.findOne({ email });

  if (existingAdmin) {
    if (existingAdmin.role !== "admin") {
      existingAdmin.role = "admin";
      await existingAdmin.save();
      console.log(`Admin role granted to ${email}`);
    }
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.create({
    name,
    email,
    password: hashedPassword,
    role: "admin"
  });

  console.log(`Admin account bootstrapped for ${email}`);
}

module.exports = bootstrapAdmin;
