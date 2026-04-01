const Order = require("../models/Order");
const PressShop = require("../models/PressShop");
const User = require("../models/User");
const { applyOrderAutomation } = require("../utils/orderAutomation");

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

  res.json({
    users,
    shops: shops.length,
    totalOrders: refreshedOrders.length,
    activeOrders: activeOrders.length,
    revenue,
    topVendors,
    overduePickupOrders
  });
};
