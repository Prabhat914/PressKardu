const Order = require("../models/Order");
const PressShop = require("../models/PressShop");
const User = require("../models/User");
const { applyOrderAutomation } = require("../utils/orderAutomation");
const { createNotification } = require("../utils/notifications");
const { getOtpDeliveryStatus } = require("../utils/otpDelivery");
const { buildSubscriptionWindow, buildSubscriptionHistoryEntry, calculateOnlineAdoptionMetrics } = require("../utils/subscription");

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

function getPayoutDestination(shop) {
  const payoutDetails = shop?.payoutDetails || {};

  if (payoutDetails.upiId) {
    return `UPI: ${payoutDetails.upiId}`;
  }

  if (payoutDetails.accountNumber && payoutDetails.ifscCode) {
    const maskedAccount = payoutDetails.accountNumber.length > 4
      ? `****${payoutDetails.accountNumber.slice(-4)}`
      : payoutDetails.accountNumber;
    return `${payoutDetails.bankName || "Bank"} ${maskedAccount} (${payoutDetails.ifscCode})`;
  }

  return "";
}

exports.getAdminOverview = async (req, res) => {
  const [orders, shops, users] = await Promise.all([
    Order.find({}).populate("pressShop", "shopName ownerUser"),
    PressShop.find({}),
    User.countDocuments({})
  ]);

  let changed = false;
  for (const order of orders) {
    if (applyOrderAutomation(order)) {
      await order.save();
      changed = true;
    }
  }

  const refreshedOrders = changed
    ? await Order.find({}).populate("pressShop", "shopName ownerUser")
    : orders;

  const activeOrders = refreshedOrders.filter((order) => !["completed", "cancelled", "rejected"].includes(order.status));
  const revenue = refreshedOrders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
  const platformRevenue = refreshedOrders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + Number(order.pricing?.platformFee || 0), 0);
  const pendingPayoutAmount = refreshedOrders
    .filter((order) => order.paymentMode === "online" && order.paymentStatus === "paid" && order.payoutStatus === "pending")
    .reduce((sum, order) => sum + Number(order.pricing?.shopEarning || 0), 0);
  const settledPayoutAmount = refreshedOrders
    .filter((order) => order.payoutStatus === "settled")
    .reduce((sum, order) => sum + Number(order.payoutSettlement?.amount || order.pricing?.shopEarning || 0), 0);

  const vendorMap = refreshedOrders.reduce((accumulator, order) => {
    const shopId = String(order.pressShop?._id || "");
    if (!shopId) {
      return accumulator;
    }

    const current = accumulator.get(shopId) || {
      shopId,
      shopName: order.pressShop.shopName || "Press shop",
      orders: 0,
      revenue: 0
    };

    current.orders += 1;
    current.revenue += order.paymentStatus === "paid" ? Number(order.totalPrice || 0) : 0;
    accumulator.set(shopId, current);
    return accumulator;
  }, new Map());

  const topVendors = Array.from(vendorMap.values())
    .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
    .slice(0, 5);

  const vendorOrderMap = refreshedOrders.reduce((accumulator, order) => {
    const shopId = String(order.pressShop?._id || "");
    if (!shopId) {
      return accumulator;
    }

    const current = accumulator.get(shopId) || [];
    current.push({
      paymentMode: order.paymentMode,
      paymentStatus: order.paymentStatus,
      status: order.status
    });
    accumulator.set(shopId, current);
    return accumulator;
  }, new Map());

  const offlineHeavyShops = shops
    .map((shop) => ({
      _id: shop._id,
      shopName: shop.shopName,
      ownerUser: shop.ownerUser,
      ...calculateOnlineAdoptionMetrics(vendorOrderMap.get(String(shop._id)) || [])
    }))
    .filter((shop) => shop.isOfflineHeavy)
    .sort((a, b) => b.offlineOrders - a.offlineOrders)
    .slice(0, 5);

  const overduePickupOrders = refreshedOrders
    .filter((order) => order.status === "accepted" && order.autoCancelAt && new Date(order.autoCancelAt) > new Date())
    .sort((a, b) => new Date(a.autoCancelAt) - new Date(b.autoCancelAt))
    .slice(0, 5)
    .map((order) => ({
      _id: order._id,
      status: order.status,
      pickupAddress: order.pickupAddress,
      autoCancelAt: order.autoCancelAt,
      pressShop: order.pressShop
    }));

  const pendingPayoutOrders = await Order.find({
    paymentMode: "online",
    paymentStatus: "paid",
    payoutStatus: "pending",
    status: { $in: ["delivered", "completed"] }
  })
    .populate("pressShop")
    .populate("user", "name email phone role")
    .sort({ updatedAt: -1 })
    .then((ordersWithRelations) => ordersWithRelations.map((order) => ({
      ...order.toObject(),
      payoutDestination: getPayoutDestination(order.pressShop)
    })));

  res.json({
    users,
    shops: shops.length,
    pendingShops: shops.filter((shop) => shop.verificationStatus === "pending").length,
    reportedShops: shops.filter((shop) => (shop.reportCount || 0) > 0).length,
    totalOrders: refreshedOrders.length,
    activeOrders: activeOrders.length,
    revenue,
    platformRevenue,
    pendingPayoutAmount,
    settledPayoutAmount,
    otpProviders: getOtpDeliveryStatus(),
    topVendors,
    offlineHeavyShops,
    overduePickupOrders,
    pendingPayoutOrders
  });
};

exports.getAdminShops = async (req, res) => {
  const shops = await PressShop.find({})
    .populate("ownerUser", "name email phone")
    .populate("verificationReviewedBy", "name email")
    .sort({ verificationStatus: 1, reportCount: -1, createdAt: -1 });
  const orders = await Order.find({ pressShop: { $in: shops.map((shop) => shop._id) } })
    .select("pressShop paymentMode paymentStatus status");
  const orderMap = orders.reduce((accumulator, order) => {
    const key = String(order.pressShop);
    const current = accumulator.get(key) || [];
    current.push({
      paymentMode: order.paymentMode,
      paymentStatus: order.paymentStatus,
      status: order.status
    });
    accumulator.set(key, current);
    return accumulator;
  }, new Map());

  res.json(shops.map((shop) => ({
    ...shop.toObject(),
    adoptionMetrics: calculateOnlineAdoptionMetrics(orderMap.get(String(shop._id)) || [])
  })));
};

exports.reviewAdminShop = async (req, res) => {
  const shop = await PressShop.findById(req.params.id);

  if (!shop) {
    return res.status(404).json({ message: "Press shop not found" });
  }

  const nextStatus = req.body.verificationStatus;
  const reviewNotes = String(req.body.verificationNotes || "").trim();
  if (!["approved", "rejected", "pending"].includes(nextStatus)) {
    return res.status(400).json({ message: "A valid verification status is required" });
  }

  if (["rejected", "pending"].includes(nextStatus) && reviewNotes.length < 10) {
    return res.status(400).json({ message: "Please add a short admin note for rejected or pending shops" });
  }

  shop.verificationStatus = nextStatus;
  shop.verificationNotes = reviewNotes;
  shop.verificationReviewedAt = new Date();
  shop.verificationReviewedBy = req.user.id;
  shop.shopPhotoReviewed = nextStatus === "approved";
  pushVerificationHistory(
    shop,
    nextStatus,
    reviewNotes || `Shop ${nextStatus} by admin.`,
    "admin-review",
    req.user.id
  );

  if (nextStatus === "approved") {
    shop.reports = [];
    shop.reportCount = 0;
  }

  await shop.save();
  await createNotification({
    user: shop.ownerUser,
    title: `Shop review update: ${nextStatus}`,
    body: nextStatus === "approved"
      ? `${shop.shopName} is now approved and visible to customers.`
      : reviewNotes || `${shop.shopName} remains under review.`,
    type: "system",
    metadata: {
      shopId: String(shop._id),
      verificationStatus: nextStatus
    }
  });

  const reviewedShop = await PressShop.findById(shop._id)
    .populate("ownerUser", "name email phone")
    .populate("verificationReviewedBy", "name email");

  res.json({
    message: `Shop ${nextStatus} successfully.`,
    shop: reviewedShop
  });
};

exports.approveOfflineSubscription = async (req, res) => {
  const shop = await PressShop.findById(req.params.id).populate("ownerUser", "name email phone");

  if (!shop) {
    return res.status(404).json({ message: "Press shop not found" });
  }

  if (!shop.pendingSubscription || shop.pendingSubscription.paymentMode !== "offline") {
    return res.status(400).json({ message: "No offline subscription approval is pending for this shop" });
  }

  const { startsAt, expiresAt } = buildSubscriptionWindow(new Date());
  shop.subscriptionPlan = shop.pendingSubscription.planId;
  shop.subscriptionStatus = "active";
  shop.subscriptionPaymentMode = "offline";
  shop.subscriptionAmount = Number(shop.pendingSubscription.amount || 0);
  shop.subscriptionStartedAt = startsAt;
  shop.subscriptionExpiresAt = expiresAt;
  shop.subscriptionHistory.push(buildSubscriptionHistoryEntry({
    planId: shop.pendingSubscription.planId,
    status: "active",
    paymentMode: "offline",
    amount: Number(shop.pendingSubscription.amount || 0),
    notes: "Offline subscription approved by admin.",
    actor: req.user.id
  }));
  shop.pendingSubscription = undefined;
  await shop.save();

  await createNotification({
    user: shop.ownerUser?._id,
    title: "Subscription activated",
    body: `${shop.shopName} subscription is now active on the ${shop.subscriptionPlan} plan.`,
    type: "system",
    metadata: {
      shopId: String(shop._id),
      subscriptionPlan: shop.subscriptionPlan
    }
  });

  const refreshedShop = await PressShop.findById(shop._id)
    .populate("ownerUser", "name email phone")
    .populate("verificationReviewedBy", "name email");

  res.json({
    message: "Offline subscription approved successfully.",
    shop: refreshedShop
  });
};

exports.settleOrderPayout = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("pressShop")
    .populate("user", "name email phone role");

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.paymentMode !== "online" || order.paymentStatus !== "paid") {
    return res.status(400).json({ message: "Sirf paid online orders ka payout settle kiya ja sakta hai." });
  }

  if (order.payoutStatus === "settled") {
    return res.status(400).json({ message: "Is order ka payout pehle hi settled hai." });
  }

  if (!["delivered", "completed"].includes(order.status)) {
    return res.status(400).json({ message: "Payout settle karne se pehle order delivered ya completed hona chahiye." });
  }

  const destinationLabel = getPayoutDestination(order.pressShop);

  if (!destinationLabel) {
    return res.status(400).json({ message: "Shopkeeper payout details missing hain. Pehle unka payout account setup karvao." });
  }

  order.payoutStatus = "settled";
  order.payoutSettlement = {
    amount: Number(order.pricing?.shopEarning || 0),
    destinationLabel,
    reference: String(req.body.settlementReference || "").trim(),
    notes: String(req.body.settlementNotes || "").trim(),
    settledAt: new Date(),
    settledBy: req.user.id
  };

  await order.save();

  if (order.pressShop?.ownerUser) {
    await createNotification({
      user: order.pressShop.ownerUser,
      order: order._id,
      title: "Payout settled",
      body: `Rs. ${Number(order.pricing?.shopEarning || 0)} settlement recorded for ${order.pressShop.shopName}.`,
      type: "payment",
      metadata: {
        payoutStatus: "settled",
        reference: order.payoutSettlement.reference
      }
    });
  }

  res.json({
    message: "Payout settled successfully.",
    order
  });
};
