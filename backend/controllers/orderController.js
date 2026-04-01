const Order = require("../models/Order");
const PressShop = require("../models/PressShop");
const { createNotification } = require("../utils/notifications");
const { addTimelineEvent, applyOrderAutomation } = require("../utils/orderAutomation");
const { createPaymentSession, buildExpectedSignature } = require("../services/paymentService");

const PICKUP_GRACE_HOURS = Number(process.env.PICKUP_GRACE_HOURS || 4);
const allowedStatuses = new Set(["pending", "accepted", "picked_up", "pressed", "delivered", "completed", "cancelled", "rejected", "reschedule_requested"]);

async function syncAutomations(orders) {
  let changed = false;

  for (const order of orders) {
    if (applyOrderAutomation(order)) {
      await order.save();
      changed = true;
    }
  }

  return changed;
}

async function notifyParticipants(order, payloads) {
  await Promise.all(payloads.filter(Boolean).map((payload) => createNotification({
    user: payload.user,
    order: order._id,
    title: payload.title,
    body: payload.body,
    type: payload.type,
    metadata: payload.metadata
  })));
}

// create order
exports.createOrder = async (req, res) => {
  const {
    pressShop,
    clothesCount,
    pickupAddress,
    notes,
    paymentMode,
    paymentMethod,
    clothType,
    serviceType,
    pickupDate,
    pickupTime,
    deliveryDate,
    deliveryTime,
    couponCode
  } = req.body;

  const shop = await PressShop.findById(pressShop);

  if (!shop) {
    return res.status(404).json({ message: "Press shop not found" });
  }

  const itemCount = Number(clothesCount);

  if (!Number.isFinite(itemCount) || itemCount < 1) {
    return res.status(400).json({ message: "A valid clothes count is required" });
  }

  if (!pickupAddress?.trim()) {
    return res.status(400).json({ message: "Pickup address is required" });
  }

  if (!["online", "offline"].includes(paymentMode || "offline")) {
    return res.status(400).json({ message: "Invalid payment mode" });
  }

  const pricePerCloth = Number(shop.pricePerCloth || 0);
  const totalPrice = itemCount * pricePerCloth;

  const draftOrder = new Order({
    user: req.user.id,
    pressShop,
    clothesCount: itemCount,
    clothType,
    serviceType,
    pickupAddress,
    notes,
    pickupDate,
    pickupTime,
    deliveryDate,
    deliveryTime,
    paymentMode: paymentMode || "offline",
    paymentMethod: paymentMethod || "cash",
    couponCode,
    totalPrice
  });
  const paymentSession = await createPaymentSession(draftOrder);

  if (paymentSession) {
    draftOrder.paymentVerification = {
      gatewayOrderId: paymentSession.gatewayOrderId
    };
  }

  const order = await draftOrder.save();

  const populatedOrder = await Order.findById(order._id)
    .populate("pressShop")
    .populate("user", "name email phone role");

  if (shop.ownerUser) {
    await createNotification({
      user: shop.ownerUser,
      order: order._id,
      title: "New order request received",
      body: `A new pickup request has been created for ${itemCount} clothes.`,
      type: "order",
      metadata: { status: order.status }
    });
  }

  res.status(201).json({
    ...populatedOrder.toObject(),
    paymentSession
  });
};

// get my orders
exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user.id })
    .populate("pressShop")
    .populate("user", "name email phone role")
    .sort({ createdAt: -1 });

  const changed = await syncAutomations(orders);

  if (changed) {
    return exports.getMyOrders(req, res);
  }

  res.json(orders);
};

exports.getShopOrders = async (req, res) => {
  const shop = await PressShop.findOne({ ownerUser: req.user.id });

  if (!shop) {
    return res.status(404).json({ message: "No press shop found for this account" });
  }

  const orders = await Order.find({ pressShop: shop._id })
    .populate("pressShop")
    .populate("user", "name email phone role")
    .sort({ createdAt: -1 });

  const changed = await syncAutomations(orders);

  if (changed) {
    return exports.getShopOrders(req, res);
  }

  res.json(orders);
};

// update order status
exports.updateOrderStatus = async (req, res) => {
  const { status, paymentStatus } = req.body;
  const order = await Order.findById(req.params.id).populate("pressShop");

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const shop = await PressShop.findOne({ ownerUser: req.user.id });
  const isOwner = String(order.user) === req.user.id;
  const isShopkeeper = shop && String(order.pressShop._id) === String(shop._id);

  if (!isOwner && !isShopkeeper) {
    return res.status(403).json({ message: "You cannot update this order" });
  }

  if (status) {
    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    if ((status === "accepted" || status === "rejected") && !isShopkeeper) {
      return res.status(403).json({ message: "Only the shop can accept or reject this order" });
    }

    if (status === "rejected" && order.status !== "pending") {
      return res.status(400).json({ message: "Only pending orders can be rejected" });
    }

    order.status = status;

    if (status === "accepted") {
      order.acceptedAt = new Date();
      order.autoCancelAt = new Date(Date.now() + PICKUP_GRACE_HOURS * 60 * 60 * 1000);
    }

    if (status === "picked_up") {
      order.autoCancelAt = undefined;
      order.autoCancelledReason = undefined;
    }

    addTimelineEvent(order, status, status.replace(/_/g, " "));
  }

  if (paymentStatus) {
    if (paymentStatus === "paid" && order.paymentMode === "online" && !order.paymentVerification?.verifiedAt) {
      return res.status(400).json({ message: "Online payments must be verified by signature before marking paid" });
    }
    order.paymentStatus = paymentStatus;
  }

  await order.save();

  const updatedOrder = await Order.findById(order._id)
    .populate("pressShop")
    .populate("user", "name email phone role");

  const notifications = [];

  if (status === "accepted") {
    notifications.push({
      user: updatedOrder.user._id,
      title: "Order accepted",
      body: `${updatedOrder.pressShop?.shopName || "Your shop"} accepted the pickup request.`,
      type: "order",
      metadata: { status }
    });
  }

  if (status === "rejected") {
    notifications.push({
      user: updatedOrder.user._id,
      title: "Order rejected",
      body: `${updatedOrder.pressShop?.shopName || "The shop"} rejected the request. You can choose another vendor.`,
      type: "order",
      metadata: { status }
    });
  }

  if (status === "delivered") {
    notifications.push({
      user: updatedOrder.user._id,
      title: "Out for delivery",
      body: "Your clothes are on the way.",
      type: "tracking",
      metadata: { status }
    });
  }

  if (status === "completed") {
    notifications.push({
      user: updatedOrder.user._id,
      title: "Order completed",
      body: "Delivery has been completed successfully.",
      type: "order",
      metadata: { status }
    });
  }

  if (paymentStatus === "paid") {
    notifications.push({
      user: updatedOrder.user._id,
      title: "Payment completed",
      body: "Your payment has been marked as paid.",
      type: "payment",
      metadata: { paymentStatus }
    });
  }

  await notifyParticipants(updatedOrder, notifications);

  res.json(updatedOrder);
};

exports.verifyPaymentSignature = async (req, res) => {
  const { gatewayOrderId, gatewayPaymentId, signature } = req.body;
  const secret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

  if (!gatewayOrderId || !gatewayPaymentId || !signature) {
    return res.status(400).json({ message: "Payment verification fields are required" });
  }

  if (!secret) {
    return res.status(500).json({ message: "Payment verification secret is not configured" });
  }

  const order = await Order.findById(req.params.id).populate("pressShop").populate("user", "name email phone role");

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (String(order.user._id) !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "You cannot verify payment for this order" });
  }

  const expectedSignature = buildExpectedSignature({ gatewayOrderId, gatewayPaymentId });

  if (expectedSignature !== signature) {
    return res.status(400).json({ message: "Payment signature verification failed" });
  }

  order.paymentStatus = "paid";
  order.paymentVerification = {
    gatewayOrderId,
    gatewayPaymentId,
    signature,
    verifiedAt: new Date()
  };
  addTimelineEvent(order, "payment_verified", "Payment verified");
  await order.save();

  await createNotification({
    user: order.user._id,
    order: order._id,
    title: "Payment verified",
    body: "Backend signature verification completed successfully.",
    type: "payment",
    metadata: { paymentStatus: "paid" }
  });

  res.json(order);
};

exports.requestReschedule = async (req, res) => {
  const { reason, pickupDate, pickupTime, deliveryDate, deliveryTime } = req.body;
  const order = await Order.findById(req.params.id).populate("pressShop").populate("user", "name email phone role");

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const shop = await PressShop.findOne({ ownerUser: req.user.id });
  const isOwner = String(order.user._id) === req.user.id;
  const isShopkeeper = shop && String(order.pressShop._id) === String(shop._id);

  if (!isOwner && !isShopkeeper && req.user.role !== "admin") {
    return res.status(403).json({ message: "You cannot request a reschedule for this order" });
  }

  order.status = "reschedule_requested";
  order.rescheduleRequest = {
    requestedBy: req.user.role === "presswala" ? "presswala" : req.user.role === "admin" ? "admin" : "user",
    reason,
    requestedPickupDate: pickupDate,
    requestedPickupTime: pickupTime,
    requestedDeliveryDate: deliveryDate,
    requestedDeliveryTime: deliveryTime,
    status: "pending"
  };
  addTimelineEvent(order, "reschedule_requested", "Reschedule requested");
  await order.save();

  const targetUser = isOwner ? order.pressShop.ownerUser : order.user._id;
  await createNotification({
    user: targetUser,
    order: order._id,
    title: "Reschedule requested",
    body: reason || "A new reschedule request needs review.",
    type: "reschedule",
    metadata: { status: "pending" }
  });

  res.json(order);
};

exports.resolveReschedule = async (req, res) => {
  const { action } = req.body;
  const order = await Order.findById(req.params.id).populate("pressShop").populate("user", "name email phone role");

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const shop = await PressShop.findOne({ ownerUser: req.user.id });
  const isOwner = String(order.user._id) === req.user.id;
  const isShopkeeper = shop && String(order.pressShop._id) === String(shop._id);

  if (!isOwner && !isShopkeeper && req.user.role !== "admin") {
    return res.status(403).json({ message: "You cannot resolve this reschedule request" });
  }

  if (!order.rescheduleRequest || order.rescheduleRequest.status !== "pending") {
    return res.status(400).json({ message: "No pending reschedule request found" });
  }

  if (!["approved", "rejected"].includes(action)) {
    return res.status(400).json({ message: "Invalid reschedule action" });
  }

  order.rescheduleRequest.status = action;
  order.rescheduleRequest.resolvedAt = new Date();

  if (action === "approved") {
    order.pickupDate = order.rescheduleRequest.requestedPickupDate || order.pickupDate;
    order.pickupTime = order.rescheduleRequest.requestedPickupTime || order.pickupTime;
    order.deliveryDate = order.rescheduleRequest.requestedDeliveryDate || order.deliveryDate;
    order.deliveryTime = order.rescheduleRequest.requestedDeliveryTime || order.deliveryTime;
    order.status = "accepted";
    addTimelineEvent(order, "accepted", "Reschedule approved");
  } else {
    order.status = "accepted";
    addTimelineEvent(order, "accepted", "Reschedule rejected");
  }

  await order.save();

  const targetUser = isOwner ? order.pressShop.ownerUser : order.user._id;
  await createNotification({
    user: targetUser,
    order: order._id,
    title: action === "approved" ? "Reschedule approved" : "Reschedule rejected",
    body: action === "approved" ? "The new pickup and delivery slots are now active." : "The previous schedule remains active.",
    type: "reschedule",
    metadata: { action }
  });

  res.json(order);
};

exports.updateLiveTracking = async (req, res) => {
  const { lat, lng } = req.body;
  const order = await Order.findById(req.params.id).populate("pressShop");

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const shop = await PressShop.findOne({ ownerUser: req.user.id });
  const isShopkeeper = shop && String(order.pressShop._id) === String(shop._id);

  if (!isShopkeeper && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only the shop or admin can update live tracking" });
  }

  order.liveTracking.currentLocation = {
    lat: Number(lat),
    lng: Number(lng),
    updatedAt: new Date(),
    updatedBy: req.user.role === "admin" ? "admin" : "presswala"
  };
  order.liveTracking.history.push({
    lat: Number(lat),
    lng: Number(lng)
  });

  await order.save();

  await createNotification({
    user: order.user,
    order: order._id,
    title: "Live delivery location updated",
    body: "Track the latest delivery movement on your order card.",
    type: "tracking",
    metadata: { lat: Number(lat), lng: Number(lng) }
  });

  res.json(order);
};
