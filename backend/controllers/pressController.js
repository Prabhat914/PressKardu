const PressShop = require("../models/PressShop");
const Order = require("../models/Order");
const { normalizePhone } = require("../utils/phoneVerification");
const { calculateOnlineAdoptionMetrics } = require("../utils/subscription");

const buildFraudSignals = ({ address, phone, latitude, longitude, serviceRadiusKm, duplicatePhoneCount, nearbyDuplicateCount }) => {
  const signals = [];

  if (String(address || "").trim().length < 12) {
    signals.push("Address is too short for verification");
  }

  const phoneDigits = String(phone || "").replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    signals.push("Phone number is missing or incomplete");
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    signals.push("Coordinates are invalid");
  }

  if (serviceRadiusKm && Number(serviceRadiusKm) > 30) {
    signals.push("Service radius is unusually large");
  }

  if (duplicatePhoneCount > 0) {
    signals.push("Phone number is already used by another shop");
  }

  if (nearbyDuplicateCount > 2) {
    signals.push("Multiple shops are clustered at the same location");
  }

  return signals;
};

const getVisibleShopQuery = () => ({ verificationStatus: "approved" });

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

async function attachMarketplaceSignals(shops) {
  if (!shops.length) {
    return shops;
  }

  const stats = await Order.aggregate([
    {
      $match: {
        pressShop: {
          $in: shops.map((shop) => shop._id)
        }
      }
    },
    {
      $group: {
        _id: "$pressShop",
        orders: { $push: { paymentMode: "$paymentMode", paymentStatus: "$paymentStatus", status: "$status" } }
      }
    }
  ]);

  const statsMap = new Map(
    stats.map((item) => [String(item._id), calculateOnlineAdoptionMetrics(item.orders)])
  );

  return shops.map((shop) => {
    const metrics = statsMap.get(String(shop._id)) || calculateOnlineAdoptionMetrics([]);
    const subscriptionBoost = shop.subscriptionPlan === "premium" ? 16 : shop.subscriptionPlan === "pro" ? 8 : 0;
    const rankingBoost = subscriptionBoost + Math.round(metrics.onlineConversionScore * 0.12);

    const nextShop = shop.toObject ? shop.toObject() : shop;
    nextShop.marketplaceSignals = {
      onlineConversionScore: metrics.onlineConversionScore,
      onlinePreferred: metrics.onlineConversionScore >= 45 || ["pro", "premium"].includes(shop.subscriptionPlan),
      prepaidPriorityReady: ["pro", "premium"].includes(shop.subscriptionPlan),
      rankingBoost,
      fasterPayoutEligible: ["pro", "premium"].includes(shop.subscriptionPlan) && metrics.onlineOrders >= 1,
      customerProtection: ["pro", "premium"].includes(shop.subscriptionPlan)
    };

    return nextShop;
  }).sort((a, b) => {
    const boostDiff = Number(b.marketplaceSignals?.rankingBoost || 0) - Number(a.marketplaceSignals?.rankingBoost || 0);
    if (boostDiff !== 0) {
      return boostDiff;
    }

    return Number(b.rating || 0) - Number(a.rating || 0);
  });
}

exports.createPressShop = async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Authentication is required to create a shop" });
  }

  if (!["presswala", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Only shopkeeper or admin accounts can create a press shop" });
  }

  const existingShop = await PressShop.findOne({ ownerUser: req.user.id });

  if (existingShop) {
    return res.status(409).json({ message: "A press shop already exists for this account" });
  }

  const latitude = Number(req.body.latitude);
  const longitude = Number(req.body.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ message: "Valid latitude and longitude are required" });
  }

  const duplicatePhoneCount = req.body.phone
    ? await PressShop.countDocuments({ phone: normalizePhone(req.body.phone), ownerUser: { $ne: req.user.id } })
    : 0;

  const nearbyDuplicateCount = await PressShop.countDocuments({
    "location.coordinates.0": { $gte: longitude - 0.0005, $lte: longitude + 0.0005 },
    "location.coordinates.1": { $gte: latitude - 0.0005, $lte: latitude + 0.0005 }
  });

  const fraudSignals = buildFraudSignals({
    address: req.body.address,
    phone: req.body.phone,
    latitude,
    longitude,
    serviceRadiusKm: req.body.serviceRadiusKm,
    duplicatePhoneCount,
    nearbyDuplicateCount
  });

  const shop = await PressShop.create({
    ownerUser: req.user.id,
    shopName: req.body.shopName,
    ownerName: req.body.ownerName || req.body.name || "Press shop owner",
    phone: normalizePhone(req.body.phone),
    verificationStatus: "pending",
    verificationSubmittedAt: new Date(),
    verificationHistory: [
      {
        status: "pending",
        notes: "Shop submitted and awaiting admin verification.",
        source: "create-shop",
        actor: req.user.id,
        createdAt: new Date()
      }
    ],
    fraudSignals,
    address: req.body.address,
    location: {
      type: "Point",
      coordinates: [longitude, latitude]
    },
    pricePerCloth: req.body.pricePerCloth,
    serviceRadiusKm: req.body.serviceRadiusKm,
    specialty: req.body.specialty,
    eta: req.body.eta,
    pickupWindow: req.body.pickupWindow,
    services: Array.isArray(req.body.services) ? req.body.services.map((item) => String(item).trim()).filter(Boolean) : [],
    about: req.body.about
  });

  res.status(201).json(shop);
};

exports.getPressShops = async (req, res) => {
  const { service, maxPrice, featured, q, sortBy } = req.query;
  const query = getVisibleShopQuery();

  if (service) {
    query.services = { $in: [service] };
  }

  if (featured === "true") {
    query.isFeatured = true;
  }

  if (maxPrice) {
    query.pricePerCloth = { $lte: Number(maxPrice) };
  }

  if (q) {
    query.$or = [
      { shopName: { $regex: q, $options: "i" } },
      { address: { $regex: q, $options: "i" } },
      { specialty: { $regex: q, $options: "i" } }
    ];
  }

  let sort = { rating: -1, createdAt: -1 };

  if (sortBy === "price") {
    sort = { pricePerCloth: 1, rating: -1 };
  } else if (sortBy === "fastest") {
    sort = { turnaroundHours: 1, rating: -1 };
  }

  const shops = await PressShop.find(query).sort(sort);
  res.json(await attachMarketplaceSignals(shops));
};

exports.getPressShopById = async (req, res) => {
  const shop = await PressShop.findById(req.params.id);

  if (!shop || shop.verificationStatus !== "approved") {
    return res.status(404).json({ message: "Press shop not found" });
  }

  const [enrichedShop] = await attachMarketplaceSignals([shop]);
  res.json(enrichedShop);
};

exports.getNearbyPressShops = async (req, res) => {
  const { lat, lng } = req.query;
  const latitude = Number.parseFloat(lat);
  const longitude = Number.parseFloat(lng);
  const maxDistanceKm = Number.parseFloat(req.query.maxDistanceKm) || 25;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ message: "Valid lat and lng query parameters are required" });
  }

  const nearbyShops = await PressShop.find({
    ...getVisibleShopQuery(),
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        $maxDistance: Math.max(1, maxDistanceKm) * 1000
      }
    }
  });

  if (nearbyShops.length > 0) {
    return res.json(await attachMarketplaceSignals(nearbyShops));
  }

  const fallbackShops = await PressShop.find(getVisibleShopQuery())
    .sort({ createdAt: -1, rating: -1 })
    .limit(20);

  return res.json(await attachMarketplaceSignals(fallbackShops));
};

exports.reportPressShop = async (req, res) => {
  const shop = await PressShop.findById(req.params.id);

  if (!shop || shop.verificationStatus !== "approved") {
    return res.status(404).json({ message: "Press shop not found" });
  }

  const reason = String(req.body.reason || "").trim();
  const reporterName = String(req.body.reporterName || "").trim();
  const reporterContact = String(req.body.reporterContact || "").trim();

  if (reason.length < 10) {
    return res.status(400).json({ message: "Please share a short reason for the report" });
  }

  shop.reports.push({
    reason,
    reporterName,
    reporterContact
  });
  shop.reportCount = shop.reports.length;

  if (shop.reportCount >= 3 && shop.verificationStatus === "approved") {
    shop.verificationNotes = "Multiple reports received. Auto-pending is disabled, so admin should review manually.";
    pushVerificationHistory(
      shop,
      "approved",
      "Multiple reports received. Auto-pending is disabled, so admin should review manually.",
      "report-threshold"
    );
  }

  await shop.save();

  res.json({
    message: "Thanks. The shop has been flagged for review.",
    reportCount: shop.reportCount,
    verificationStatus: shop.verificationStatus
  });
};
