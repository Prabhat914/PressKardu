const User = require("../models/User");
const PressShop = require("../models/PressShop");
const { getVerifiedPhoneSession, normalizePhone } = require("../utils/phoneVerification");
const { listSubscriptionPlans, getShopPaymentCapabilities, buildSubscriptionWindow, buildSubscriptionHistoryEntry } = require("../utils/subscription");
const { createSubscriptionPaymentSession, buildExpectedSignature } = require("../services/paymentService");

const buildFraudSignals = ({ address, phone, latitude, longitude, serviceRadiusKm, duplicatePhoneCount }) => {
  const signals = [];

  if (String(address || "").trim().length < 12) {
    signals.push("Address is too short for verification");
  }

  const phoneDigits = String(phone || "").replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    signals.push("Phone number is missing or incomplete");
  }

  if ((latitude !== undefined || longitude !== undefined) && (!Number.isFinite(latitude) || !Number.isFinite(longitude))) {
    signals.push("Coordinates are invalid");
  }

  if (serviceRadiusKm !== undefined && Number(serviceRadiusKm) > 30) {
    signals.push("Service radius is unusually large");
  }

  if (duplicatePhoneCount > 0) {
    signals.push("Phone number is already used by another shop");
  }

  return signals;
};

function buildProfileResponse(user, pressShop = null) {
  const capabilities = pressShop ? getShopPaymentCapabilities(pressShop) : null;
  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    },
    pressShop,
    subscriptionPlans: user.role === "presswala" ? listSubscriptionPlans() : [],
    paymentCapabilities: capabilities
  };
}

function isValidShopPhotoDataUrl(value) {
  return /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(String(value || ""));
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function pushVerificationHistory(shop, status, notes, source, actor) {
  shop.verificationHistory = Array.isArray(shop.verificationHistory) ? shop.verificationHistory : [];
  shop.verificationHistory.push({
    status,
    notes,
    source,
    actor,
    createdAt: new Date()
  });
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
  const normalizedNextPhone = req.body.phone !== undefined ? normalizePhone(nextPhone) : undefined;

  let pressShop = null;

  if (user.role === "presswala") {
    pressShop = await PressShop.findOne({ ownerUser: user._id });

    if (pressShop) {
      let requiresReverification = false;
      const currentShopPhone = normalizePhone(pressShop.phone);
      const phoneChanged = req.body.phone !== undefined && normalizedNextPhone !== currentShopPhone;

      if (phoneChanged) {
        const duplicatePhoneUser = normalizedNextPhone
          ? await User.findOne({ phone: normalizedNextPhone, _id: { $ne: user._id } })
          : null;
        const duplicatePhoneShop = normalizedNextPhone
          ? await PressShop.findOne({ phone: normalizedNextPhone, _id: { $ne: pressShop._id } })
          : null;

        if (duplicatePhoneUser || duplicatePhoneShop) {
          return res.status(400).json({ message: "Phone number is already linked to another account or shop" });
        }

        const phoneVerification = await getVerifiedPhoneSession(normalizedNextPhone);
        if (!phoneVerification || phoneVerification.consumedAt) {
          return res.status(400).json({ message: "Verify the new phone number with OTP before saving it." });
        }

        pressShop.phoneVerifiedAt = phoneVerification.verifiedAt;
        pressShop.phone = normalizedNextPhone;
        phoneVerification.consumedAt = new Date();
        await phoneVerification.save();
        requiresReverification = true;
      }

      if (req.body.shopName !== undefined) {
        const nextShopName = req.body.shopName.trim();
        if (nextShopName !== pressShop.shopName) {
          requiresReverification = true;
        }
        pressShop.shopName = nextShopName;
      }

      if (req.body.address !== undefined) {
        const nextAddress = req.body.address.trim();
        if (nextAddress !== pressShop.address) {
          requiresReverification = true;
        }
        pressShop.address = nextAddress;
      }

      pressShop.ownerName = user.name;
      if (!phoneChanged) {
        pressShop.phone = user.phone;
      }

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

      if (req.body.shopPhotoDataUrl !== undefined) {
        if (req.body.shopPhotoDataUrl && !isValidShopPhotoDataUrl(req.body.shopPhotoDataUrl)) {
          return res.status(400).json({ message: "Shop photo must be a valid image" });
        }

        pressShop.shopPhotoDataUrl = req.body.shopPhotoDataUrl || "";
        pressShop.shopPhotoReviewed = false;
        requiresReverification = true;
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
        requiresReverification = true;
      }

      if (req.body.pricePerCloth !== undefined) {
        const nextPricePerCloth = parseOptionalNumber(req.body.pricePerCloth);
        if (Number.isNaN(nextPricePerCloth) || nextPricePerCloth < 0) {
          return res.status(400).json({ message: "Price per cloth must be a valid non-negative number" });
        }
        pressShop.pricePerCloth = nextPricePerCloth;
      }

      if (req.body.serviceRadiusKm !== undefined) {
        const nextServiceRadius = parseOptionalNumber(req.body.serviceRadiusKm);
        if (Number.isNaN(nextServiceRadius) || nextServiceRadius < 1 || nextServiceRadius > 50) {
          return res.status(400).json({ message: "Service radius must be between 1 and 50 km" });
        }
        pressShop.serviceRadiusKm = nextServiceRadius;
      }

      const activePhone = normalizedNextPhone || normalizePhone(user.phone);
      const duplicatePhoneCount = activePhone
        ? await PressShop.countDocuments({ phone: activePhone, _id: { $ne: pressShop._id } })
        : 0;

      pressShop.fraudSignals = buildFraudSignals({
        address: pressShop.address,
        phone: activePhone,
        latitude: pressShop.location?.coordinates?.[1],
        longitude: pressShop.location?.coordinates?.[0],
        serviceRadiusKm: pressShop.serviceRadiusKm,
        duplicatePhoneCount
      });

      if (requiresReverification) {
        pressShop.verificationNotes = "Shop details updated after approval. Auto-pending is disabled, but admin can still review manually.";
        pushVerificationHistory(
          pressShop,
          pressShop.verificationStatus || "approved",
          "Shop details updated after approval. Auto-pending is disabled, but admin can still review manually.",
          "profile-update",
          user._id
        );
      }

      await pressShop.save();
    }
  }

  if (nextName) {
    user.name = nextName;
  }

  if (req.body.phone !== undefined) {
    user.phone = normalizedNextPhone || "";
  }

  await user.save();

  const refreshedUser = await User.findById(req.user.id).select("name email phone role");
  res.json(buildProfileResponse(refreshedUser, pressShop));
};

exports.updateSubscription = async (req, res) => {
  const user = await User.findById(req.user.id).select("name email phone role");

  if (!user || user.role !== "presswala") {
    return res.status(403).json({ message: "Only shopkeepers can manage subscription plans" });
  }

  const shop = await PressShop.findOne({ ownerUser: user._id });

  if (!shop) {
    return res.status(404).json({ message: "Press shop not found for this account" });
  }

  const planId = String(req.body.planId || "basic").trim().toLowerCase();
  const paymentMode = String(req.body.paymentMode || (planId === "basic" ? "free" : "online")).trim().toLowerCase();
  const selectedPlan = listSubscriptionPlans().find((plan) => plan.id === planId);

  if (!selectedPlan) {
    return res.status(400).json({ message: "Selected subscription plan is invalid" });
  }

  if (selectedPlan.id === "basic") {
    shop.subscriptionPlan = "basic";
    shop.subscriptionStatus = "active";
    shop.subscriptionPaymentMode = "free";
    shop.subscriptionAmount = 0;
    shop.subscriptionStartedAt = undefined;
    shop.subscriptionExpiresAt = undefined;
    shop.pendingSubscription = undefined;
    shop.subscriptionHistory.push(buildSubscriptionHistoryEntry({
      planId: "basic",
      status: "active",
      paymentMode: "free",
      amount: 0,
      notes: "Switched to the free Basic plan.",
      actor: user._id
    }));
    await shop.save();

    return res.json({
      message: "Basic plan activated.",
      pressShop: shop,
      paymentCapabilities: getShopPaymentCapabilities(shop)
    });
  }

  if (!["online", "offline"].includes(paymentMode)) {
    return res.status(400).json({ message: "Subscription payment mode must be online or offline" });
  }

  const amount = Number(selectedPlan.monthlyPrice || 0);
  shop.pendingSubscription = {
    planId: selectedPlan.id,
    paymentMode,
    amount,
    requestedAt: new Date()
  };
  shop.subscriptionPlan = selectedPlan.id;
  shop.subscriptionAmount = amount;
  shop.subscriptionPaymentMode = paymentMode;
  shop.subscriptionStatus = paymentMode === "online" ? "pending" : "pending";

  if (paymentMode === "offline") {
    shop.subscriptionHistory.push(buildSubscriptionHistoryEntry({
      planId: selectedPlan.id,
      status: "pending",
      paymentMode: "offline",
      amount,
      notes: "Offline subscription payment requested. Awaiting admin confirmation.",
      actor: user._id
    }));
    await shop.save();

    return res.json({
      message: "Offline subscription request created. Admin confirmation ke baad plan active hoga.",
      pressShop: shop,
      paymentCapabilities: getShopPaymentCapabilities(shop)
    });
  }

  const paymentSession = await createSubscriptionPaymentSession({
    shopId: String(shop._id),
    amount,
    receipt: `subscription_${shop._id}_${Date.now()}`
  });

  if (paymentSession?.gatewayOrderId) {
    shop.pendingSubscription.gatewayOrderId = paymentSession.gatewayOrderId;
  }

  shop.subscriptionHistory.push(buildSubscriptionHistoryEntry({
    planId: selectedPlan.id,
    status: "pending",
    paymentMode: "online",
    amount,
    notes: "Online subscription payment initiated.",
    actor: user._id
  }));

  await shop.save();

  return res.json({
    message: "Subscription payment session created.",
    pressShop: shop,
    paymentSession,
    paymentCapabilities: getShopPaymentCapabilities(shop)
  });
};

exports.verifySubscriptionPayment = async (req, res) => {
  const user = await User.findById(req.user.id).select("name email phone role");

  if (!user || user.role !== "presswala") {
    return res.status(403).json({ message: "Only shopkeepers can verify subscription payments" });
  }

  const shop = await PressShop.findOne({ ownerUser: user._id });

  if (!shop?.pendingSubscription || shop.pendingSubscription.paymentMode !== "online") {
    return res.status(400).json({ message: "No online subscription payment is pending" });
  }

  const { gatewayOrderId, gatewayPaymentId, signature } = req.body;

  if (!gatewayOrderId || !gatewayPaymentId || !signature) {
    return res.status(400).json({ message: "Subscription verification fields are required" });
  }

  const expectedSignature = buildExpectedSignature({ gatewayOrderId, gatewayPaymentId });

  if (expectedSignature !== signature) {
    return res.status(400).json({ message: "Subscription payment verification failed" });
  }

  const { startsAt, expiresAt } = buildSubscriptionWindow(new Date());
  shop.subscriptionPlan = shop.pendingSubscription.planId;
  shop.subscriptionStatus = "active";
  shop.subscriptionPaymentMode = "online";
  shop.subscriptionAmount = Number(shop.pendingSubscription.amount || 0);
  shop.subscriptionStartedAt = startsAt;
  shop.subscriptionExpiresAt = expiresAt;
  shop.subscriptionHistory.push(buildSubscriptionHistoryEntry({
    planId: shop.pendingSubscription.planId,
    status: "active",
    paymentMode: "online",
    amount: Number(shop.pendingSubscription.amount || 0),
    notes: "Online subscription payment verified successfully.",
    actor: user._id
  }));
  shop.pendingSubscription = undefined;
  await shop.save();

  return res.json({
    message: "Subscription activated successfully.",
    pressShop: shop,
    paymentCapabilities: getShopPaymentCapabilities(shop)
  });
};
