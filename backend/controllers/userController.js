const User = require("../models/User");
const PressShop = require("../models/PressShop");
const { getVerifiedPhoneSession, normalizePhone } = require("../utils/phoneVerification");
const { listSubscriptionPlans, getShopPaymentCapabilities, buildSubscriptionWindow, buildSubscriptionHistoryEntry } = require("../utils/subscription");
const { createSubscriptionPaymentSession, buildExpectedSignature, supportsHostedSubscriptionPayments } = require("../services/paymentService");

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

function parseOptionalBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return ["true", "yes", "1", "on"].includes(String(value).trim().toLowerCase());
}

function parsePriceList(value) {
  const incoming = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/\n|,/)
        .map((line) => {
          const [cloth, price] = line.split(/:|-/);
          return { cloth, price };
        });

  return incoming
    .map((item) => ({
      cloth: String(item.cloth || item.item || "").trim(),
      price: Number(item.price)
    }))
    .filter((item) => item.cloth && Number.isFinite(item.price) && item.price >= 0);
}

function parseStringList(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : String(value || "")
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function sanitizePayoutDetails(payload = {}) {
  return {
    accountHolderName: String(payload.accountHolderName || "").trim(),
    upiId: String(payload.upiId || "").trim(),
    bankName: String(payload.bankName || "").trim(),
    accountNumber: String(payload.accountNumber || "").trim(),
    ifscCode: String(payload.ifscCode || "").trim().toUpperCase(),
    notes: String(payload.notes || "").trim()
  };
}

function validatePayoutDetails(payoutDetails) {
  const hasUpi = Boolean(payoutDetails.upiId);
  const bankFields = [
    payoutDetails.accountHolderName,
    payoutDetails.bankName,
    payoutDetails.accountNumber,
    payoutDetails.ifscCode
  ];
  const hasAnyBankField = bankFields.some(Boolean);
  const hasCompleteBankProfile = bankFields.every(Boolean);

  if (!hasUpi && !hasAnyBankField) {
    return { valid: true };
  }

  if (!hasUpi && hasAnyBankField && !hasCompleteBankProfile) {
    return {
      valid: false,
      message: "Bank payout ke liye account holder name, bank name, account number, aur IFSC sab bharna zaroori hai."
    };
  }

  if (payoutDetails.upiId && !/^[\w.-]{2,256}@[A-Za-z]{2,64}$/i.test(payoutDetails.upiId)) {
    return {
      valid: false,
      message: "UPI id valid format me enter karo."
    };
  }

  if (payoutDetails.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(payoutDetails.ifscCode)) {
    return {
      valid: false,
      message: "IFSC code valid format me enter karo."
    };
  }

  return { valid: true };
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
      pressShop.email = user.email;
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

      if (req.body.pincode !== undefined) {
        pressShop.pincode = String(req.body.pincode || "").trim();
      }

      if (req.body.landmark !== undefined) {
        pressShop.landmark = String(req.body.landmark || "").trim();
      }

      if (req.body.googleMapsUrl !== undefined) {
        pressShop.googleMapsUrl = String(req.body.googleMapsUrl || "").trim();
      }

      if (req.body.businessHours !== undefined) {
        const hours = req.body.businessHours || {};
        pressShop.businessHours = {
          openingTime: String(hours.openingTime || "").trim(),
          closingTime: String(hours.closingTime || "").trim(),
          weeklyOff: String(hours.weeklyOff || "Sunday").trim(),
          scheduleText: String(hours.scheduleText || "").trim(),
          currentStatus: ["open", "closed"].includes(String(hours.currentStatus || "").toLowerCase())
            ? String(hours.currentStatus).toLowerCase()
            : "open"
        };
      }

      if (req.body.pickupDelivery !== undefined) {
        const pickupDelivery = req.body.pickupDelivery || {};
        const pickupCharges = parseOptionalNumber(pickupDelivery.pickupCharges);
        const deliveryCharges = parseOptionalNumber(pickupDelivery.deliveryCharges);
        const freeDeliveryAbove = parseOptionalNumber(pickupDelivery.freeDeliveryAbove);
        pressShop.pickupDelivery = {
          pickupAvailable: parseOptionalBoolean(pickupDelivery.pickupAvailable, true),
          homeDelivery: parseOptionalBoolean(pickupDelivery.homeDelivery, true),
          pickupCharges: Number.isNaN(pickupCharges) ? 0 : pickupCharges || 0,
          deliveryCharges: Number.isNaN(deliveryCharges) ? 0 : deliveryCharges || 0,
          freeDeliveryAbove: Number.isNaN(freeDeliveryAbove) ? 500 : freeDeliveryAbove || 0
        };
      }

      if (req.body.capacity !== undefined) {
        const dailyOrderLimit = parseOptionalNumber(req.body.capacity?.dailyOrderLimit);
        if (Number.isNaN(dailyOrderLimit) || dailyOrderLimit < 0) {
          return res.status(400).json({ message: "Daily order capacity must be a valid non-negative number" });
        }
        pressShop.capacity = {
          dailyOrderLimit: dailyOrderLimit || 0
        };
      }

      if (req.body.staffDetails !== undefined) {
        const employees = parseOptionalNumber(req.body.staffDetails?.employees);
        const deliveryPartners = parseOptionalNumber(req.body.staffDetails?.deliveryPartners);
        if (Number.isNaN(employees) || Number.isNaN(deliveryPartners) || employees < 0 || deliveryPartners < 0) {
          return res.status(400).json({ message: "Staff counts must be valid non-negative numbers" });
        }
        pressShop.staffDetails = {
          employees: employees || 0,
          deliveryPartners: deliveryPartners || 0
        };
      }

      if (req.body.shopPhotoDataUrl !== undefined) {
        if (req.body.shopPhotoDataUrl && !isValidShopPhotoDataUrl(req.body.shopPhotoDataUrl)) {
          return res.status(400).json({ message: "Shop photo must be a valid image" });
        }

        pressShop.shopPhotoDataUrl = req.body.shopPhotoDataUrl || "";
        pressShop.shopPhotoReviewed = false;
        requiresReverification = true;
      }

      if (req.body.shopLogoDataUrl !== undefined) {
        if (req.body.shopLogoDataUrl && !isValidShopPhotoDataUrl(req.body.shopLogoDataUrl)) {
          return res.status(400).json({ message: "Shop logo must be a valid image" });
        }

        pressShop.shopLogoDataUrl = req.body.shopLogoDataUrl || "";
      }

      if (req.body.shopPhotosDataUrls !== undefined) {
        const photos = Array.isArray(req.body.shopPhotosDataUrls) ? req.body.shopPhotosDataUrls : [];
        if (photos.some((photo) => photo && !isValidShopPhotoDataUrl(photo))) {
          return res.status(400).json({ message: "Shop photos must be valid images" });
        }
        pressShop.shopPhotosDataUrls = photos.filter(Boolean).slice(0, 5);
      }

      if (Array.isArray(req.body.services)) {
        pressShop.services = req.body.services.map((item) => String(item).trim()).filter(Boolean);
      }

      if (req.body.paymentMethods !== undefined) {
        pressShop.paymentMethods = parseStringList(req.body.paymentMethods);
      }

      if (req.body.priceList !== undefined) {
        pressShop.priceList = parsePriceList(req.body.priceList);
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

      if (req.body.minimumOrderValue !== undefined) {
        const nextMinimumOrderValue = parseOptionalNumber(req.body.minimumOrderValue);
        if (Number.isNaN(nextMinimumOrderValue) || nextMinimumOrderValue < 0) {
          return res.status(400).json({ message: "Minimum order amount must be a valid non-negative number" });
        }
        pressShop.minimumOrderValue = nextMinimumOrderValue || 0;
      }

      if (req.body.serviceRadiusKm !== undefined) {
        const nextServiceRadius = parseOptionalNumber(req.body.serviceRadiusKm);
        if (Number.isNaN(nextServiceRadius) || nextServiceRadius < 1 || nextServiceRadius > 50) {
          return res.status(400).json({ message: "Service radius must be between 1 and 50 km" });
        }
        pressShop.serviceRadiusKm = nextServiceRadius;
      }

      if (req.body.payoutDetails !== undefined) {
        const nextPayoutDetails = sanitizePayoutDetails(req.body.payoutDetails);
        const payoutValidation = validatePayoutDetails(nextPayoutDetails);

        if (!payoutValidation.valid) {
          return res.status(400).json({ message: payoutValidation.message });
        }

        pressShop.payoutDetails = {
          ...nextPayoutDetails,
          updatedAt: new Date()
        };
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

  if (paymentMode === "online" && !supportsHostedSubscriptionPayments()) {
    return res.status(503).json({
      message: "Online subscription payment abhi configured nahi hai. Filhal offline request use karo."
    });
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
