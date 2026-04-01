const User = require("../models/User");
const PressShop = require("../models/PressShop");

function buildProfileResponse(user, pressShop = null) {
  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    },
    pressShop
  };
}

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select("name email phone role");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const pressShop = user.role === "presswala"
    ? await PressShop.findOne({ ownerUser: user._id })
    : null;

  res.json(buildProfileResponse(user, pressShop));
};

exports.updateProfile = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const nextName = req.body.name?.trim();
  const nextPhone = req.body.phone?.trim();

  if (nextName) {
    user.name = nextName;
  }

  if (req.body.phone !== undefined) {
    user.phone = nextPhone || "";
  }

  await user.save();

  let pressShop = null;

  if (user.role === "presswala") {
    pressShop = await PressShop.findOne({ ownerUser: user._id });

    if (pressShop) {
      if (req.body.shopName !== undefined) {
        pressShop.shopName = req.body.shopName.trim();
      }

      if (req.body.address !== undefined) {
        pressShop.address = req.body.address.trim();
      }

      pressShop.ownerName = user.name;
      pressShop.phone = user.phone;

      if (req.body.specialty !== undefined) {
        pressShop.specialty = req.body.specialty?.trim() || "";
      }

      if (req.body.eta !== undefined) {
        pressShop.eta = req.body.eta?.trim() || "";
      }

      if (req.body.pickupWindow !== undefined) {
        pressShop.pickupWindow = req.body.pickupWindow?.trim() || "";
      }

      if (req.body.about !== undefined) {
        pressShop.about = req.body.about?.trim() || "";
      }

      if (Array.isArray(req.body.services)) {
        pressShop.services = req.body.services.map((item) => String(item).trim()).filter(Boolean);
      }

      if (req.body.latitude !== undefined || req.body.longitude !== undefined) {
        const latitude = Number(req.body.latitude);
        const longitude = Number(req.body.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return res.status(400).json({ message: "Valid latitude and longitude are required to update the shop location" });
        }

        pressShop.location = {
          type: "Point",
          coordinates: [longitude, latitude]
        };
      }

      if (req.body.pricePerCloth !== undefined) {
        pressShop.pricePerCloth = Number(req.body.pricePerCloth);
      }

      if (req.body.serviceRadiusKm !== undefined) {
        pressShop.serviceRadiusKm = Number(req.body.serviceRadiusKm);
      }

      await pressShop.save();
    }
  }

  const refreshedUser = await User.findById(req.user.id).select("name email phone role");
  res.json(buildProfileResponse(refreshedUser, pressShop));
};
