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

  const normalizedEmail = email.toLowerCase();

  const downgradedAdmins = await User.updateMany(
    {
      role: "admin",
      email: { $ne: normalizedEmail }
    },
    {
      $set: { role: "user" }
    }
  );

  if (downgradedAdmins.modifiedCount > 0) {
    console.log(`Downgraded ${downgradedAdmins.modifiedCount} non-reserved admin account(s).`);
  }

  const existingAdmin = await User.findOne({ email: normalizedEmail });
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
    email: normalizedEmail,
    password: hashedPassword,
    role: "admin"
  });

  console.log(`Admin account bootstrapped for ${normalizedEmail}`);
}

module.exports = bootstrapAdmin;
