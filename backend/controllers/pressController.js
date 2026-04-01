const PressShop = require("../models/PressShop");

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

  const shop = await PressShop.create({
    ownerUser: req.user.id,
    shopName: req.body.shopName,
    ownerName: req.body.ownerName || req.body.name || "Press shop owner",
    phone: req.body.phone,
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
  const query = {};

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
  res.json(shops);
};

exports.getPressShopById = async (req, res) => {
  const shop = await PressShop.findById(req.params.id);

  if (!shop) {
    return res.status(404).json({ message: "Press shop not found" });
  }

  res.json(shop);
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
    return res.json(nearbyShops);
  }

  const fallbackShops = await PressShop.find({})
    .sort({ createdAt: -1, rating: -1 })
    .limit(20);

  return res.json(fallbackShops);
};
