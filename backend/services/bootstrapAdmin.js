const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { getAdminEmail } = require("../config/runtime");

async function bootstrapAdmin() {
  const email = getAdminEmail();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const name = process.env.ADMIN_NAME?.trim() || "PressKardu Admin";

  if (!email || !password) {
    return;
  }

  const existingAdmin = await User.findOne({ email });
  const hashedPassword = await bcrypt.hash(password, 10);

  if (existingAdmin) {
    let wasUpdated = false;

    if (existingAdmin.role !== "admin") {
      existingAdmin.role = "admin";
      wasUpdated = true;
    }

    if (existingAdmin.name !== name) {
      existingAdmin.name = name;
      wasUpdated = true;
    }

    existingAdmin.password = hashedPassword;

    await existingAdmin.save();
    console.log(wasUpdated ? `Admin account synced for ${email}` : `Admin password refreshed for ${email}`);
    return;
  }

  await User.create({
    name,
    email,
    password: hashedPassword,
    role: "admin"
  });

  console.log(`Admin account bootstrapped for ${email}`);
}

module.exports = bootstrapAdmin;
