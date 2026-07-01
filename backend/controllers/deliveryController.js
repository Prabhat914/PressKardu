const Order = require("../models/Order");
const User = require("../models/User");

const ACTIVE_STATUSES = ["accepted", "picked_up", "pressed", "delivered"];
const PARTNER_STATUSES = new Set(["picked_up", "delivered", "completed"]);

const populateOrder = (query) => query
  .populate("pressShop", "shopName address location phone")
  .populate("user", "name phone email")
  .populate("deliveryPartner", "name phone deliveryProfile");

exports.getDeliveryDashboard = async (req, res) => {
  const partner = await User.findById(req.user.id).select("name phone deliveryProfile");
  const [assignedOrders, availableOrders] = await Promise.all([
    populateOrder(Order.find({ deliveryPartner: req.user.id }).sort({ updatedAt: -1 })),
    partner?.deliveryProfile?.isAvailable
      ? populateOrder(Order.find({
          deliveryPartner: null,
          status: { $in: ["accepted", "pressed"] }
        }).sort({ createdAt: 1 }).limit(30))
      : Promise.resolve([])
  ]);

  res.json({
    partner,
    availableOrders,
    activeOrders: assignedOrders.filter((order) => ACTIVE_STATUSES.includes(order.status)),
    completedOrders: assignedOrders.filter((order) => order.status === "completed"),
    earnings: {
      total: partner?.deliveryProfile?.totalEarnings || 0,
      completedJobs: partner?.deliveryProfile?.completedJobs || 0
    }
  });
};

exports.updateAvailability = async (req, res) => {
  const partner = await User.findByIdAndUpdate(
    req.user.id,
    { $set: { "deliveryProfile.isAvailable": Boolean(req.body.isAvailable) } },
    { new: true }
  ).select("name phone deliveryProfile");

  res.json({ partner, message: partner.deliveryProfile.isAvailable ? "You are available for jobs." : "You are offline." });
};

exports.updateCurrentLocation = async (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ message: "Valid latitude and longitude are required." });
  }

  const partner = await User.findByIdAndUpdate(
    req.user.id,
    { $set: { "deliveryProfile.currentLocation": { lat, lng, updatedAt: new Date() } } },
    { new: true }
  ).select("name phone deliveryProfile");

  res.json({ partner, message: "Current location updated." });
};

exports.claimDeliveryOrder = async (req, res) => {
  const partner = await User.findById(req.user.id);
  if (!partner?.deliveryProfile?.isAvailable) {
    return res.status(400).json({ message: "Go available before accepting a job." });
  }

  const order = await populateOrder(Order.findOneAndUpdate(
    { _id: req.params.id, deliveryPartner: null, status: { $in: ["accepted", "pressed"] } },
    { $set: { deliveryPartner: req.user.id } },
    { new: true }
  ));

  if (!order) {
    return res.status(409).json({ message: "This job is no longer available." });
  }

  res.json({ order, message: "Job assigned to you." });
};

exports.updateDeliveryOrderStatus = async (req, res) => {
  const status = String(req.body.status || "");
  if (!PARTNER_STATUSES.has(status)) {
    return res.status(400).json({ message: "Invalid delivery status." });
  }

  const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.user.id });
  if (!order) {
    return res.status(404).json({ message: "Assigned order not found." });
  }

  const transitions = {
    accepted: ["picked_up"],
    pressed: ["delivered"],
    picked_up: ["delivered"],
    delivered: ["completed"]
  };
  if (!transitions[order.status]?.includes(status)) {
    return res.status(400).json({ message: `Order cannot move from ${order.status} to ${status}.` });
  }

  order.status = status;
  order.timeline.push({ status, label: status.replace(/_/g, " "), happenedAt: new Date() });

  if (status === "completed") {
    const earning = Number(process.env.DELIVERY_FEE || 30);
    order.deliveryEarning = earning;
    await User.updateOne(
      { _id: req.user.id },
      { $inc: { "deliveryProfile.completedJobs": 1, "deliveryProfile.totalEarnings": earning } }
    );
  }

  await order.save();
  const updatedOrder = await populateOrder(Order.findById(order._id));
  res.json({ order: updatedOrder, message: `Order marked ${status.replace(/_/g, " ")}.` });
};
