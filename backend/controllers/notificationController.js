const Notification = require("../models/Notification");

exports.getMyNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("order", "status pickupAddress totalPrice");

  res.json(notifications);
};

exports.markNotificationRead = async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user.id });

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  notification.isRead = true;
  await notification.save();

  res.json(notification);
};
