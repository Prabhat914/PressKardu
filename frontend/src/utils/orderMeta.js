export const statusFlow = [
  { key: "pending", label: "Placed" },
  { key: "accepted", label: "Accepted" },
  { key: "picked_up", label: "Picked up" },
  { key: "pressed", label: "In progress" },
  { key: "delivered", label: "Ready" },
  { key: "completed", label: "Delivered" }
];

export function getStatusLabel(status) {
  const match = statusFlow.find((item) => item.key === status);
  return match ? match.label : status.replace(/_/g, " ");
}

export function getTimeline(order) {
  const activeIndex = Math.max(
    statusFlow.findIndex((item) => item.key === order.status),
    0
  );

  return statusFlow.map((item, index) => ({
    ...item,
    done: index <= activeIndex,
    current: index === activeIndex
  }));
}

export function buildNotifications(orders, currentUser) {
  const base = orders.slice(0, 4).map((order) => ({
    id: `order-${order._id}`,
    title: `${order.pressShop?.shopName || "Press shop"} updated your order`,
    body: `Current stage: ${getStatusLabel(order.status)}.`,
    tone: order.status === "completed" ? "success" : "info"
  }));

  const extras = currentUser?.role === "presswala"
    ? [
        {
          id: "shop-tip",
          title: "Faster acceptance improves ranking",
          body: "Shops that accept orders quickly show up higher in local discovery.",
          tone: "tip"
        }
      ]
    : [
        {
          id: "referral",
          title: "Invite a friend and unlock 20% off",
          body: "Share your referral code to earn your next pressing coupon.",
          tone: "promo"
        }
      ];

  return [...base, ...extras];
}
