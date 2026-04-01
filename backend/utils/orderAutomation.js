function addTimelineEvent(order, status, label) {
  order.timeline.push({
    status,
    label
  });
}

function applyOrderAutomation(order) {
  const now = new Date();

  if (
    order.status === "accepted" &&
    order.autoCancelAt &&
    new Date(order.autoCancelAt) <= now
  ) {
    order.status = "cancelled";
    order.autoCancelledReason = "Pickup window expired before shop marked the order as picked up.";
    addTimelineEvent(order, "cancelled", "Auto cancelled due to pickup delay");
    return true;
  }

  return false;
}

module.exports = {
  addTimelineEvent,
  applyOrderAutomation
};
