const Notification = require("../models/Notification");

async function createNotification({ user, order, title, body, type = "order", metadata = {} }) {
  if (!user || !title || !body) {
    return null;
  }

  return Notification.create({
    user,
    order,
    title,
    body,
    type,
    metadata
  });
}

module.exports = {
  createNotification
};
