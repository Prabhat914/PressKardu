const { getSubscriptionPlan, listSubscriptionPlans } = require("../config/subscriptionPlans");
const { getPaymentProvider, supportsHostedSubscriptionPayments } = require("../services/paymentService");

const SUBSCRIPTION_DURATION_DAYS = Number(process.env.SUBSCRIPTION_DURATION_DAYS || 30);

function getShopSubscription(shop) {
  const plan = getSubscriptionPlan(shop?.subscriptionPlan);
  const status = shop?.subscriptionStatus || (plan.id === "basic" ? "active" : "inactive");
  const expiresAt = shop?.subscriptionExpiresAt ? new Date(shop.subscriptionExpiresAt) : null;
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
  const isActive = plan.id === "basic" ? true : status === "active" && !isExpired;

  return {
    plan,
    status: isExpired ? "expired" : status,
    isActive,
    expiresAt
  };
}

function getShopPaymentCapabilities(shop) {
  const subscription = getShopSubscription(shop);
  return {
    supportsOfflinePayments: subscription.plan.supportsOfflinePayments && subscription.isActive,
    supportsOnlinePayments: subscription.plan.supportsOnlinePayments && subscription.isActive,
    subscription,
    paymentProvider: getPaymentProvider(),
    hostedCheckoutAvailable: supportsHostedSubscriptionPayments()
  };
}

function buildOrderPricing({ totalPrice, paymentMode, shop }) {
  const numericTotal = Number(totalPrice || 0);
  const { subscription } = getShopPaymentCapabilities(shop);
  const commissionRate = paymentMode === "online" ? subscription.plan.onlineCommissionRate : 0;
  const platformFee = Number((numericTotal * commissionRate).toFixed(2));
  const shopEarning = Number((numericTotal - platformFee).toFixed(2));

  return {
    subtotal: numericTotal,
    platformFee,
    shopEarning,
    commissionRate,
    planId: subscription.plan.id,
    planName: subscription.plan.name
  };
}

function buildSubscriptionWindow(startDate = new Date()) {
  const startsAt = new Date(startDate);
  const expiresAt = new Date(startsAt.getTime() + SUBSCRIPTION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  return { startsAt, expiresAt };
}

function buildSubscriptionHistoryEntry({ planId, status, paymentMode, amount, notes, actor }) {
  return {
    planId,
    status,
    paymentMode,
    amount,
    notes,
    actor,
    createdAt: new Date()
  };
}

function calculateOnlineAdoptionMetrics(orders = []) {
  const totalOrders = orders.length;
  const onlineOrders = orders.filter((order) => order.paymentMode === "online");
  const offlineOrders = orders.filter((order) => order.paymentMode === "offline");
  const paidOnlineOrders = onlineOrders.filter((order) => order.paymentStatus === "paid");
  const completedOrders = orders.filter((order) => order.status === "completed");
  const onlineConversionScore = totalOrders > 0 ? Math.round((onlineOrders.length / totalOrders) * 100) : 0;

  return {
    totalOrders,
    onlineOrders: onlineOrders.length,
    offlineOrders: offlineOrders.length,
    paidOnlineOrders: paidOnlineOrders.length,
    completedOrders: completedOrders.length,
    onlineConversionScore,
    isOfflineHeavy: totalOrders >= 3 && onlineOrders.length / totalOrders < 0.25
  };
}

module.exports = {
  SUBSCRIPTION_DURATION_DAYS,
  listSubscriptionPlans,
  getShopSubscription,
  getShopPaymentCapabilities,
  buildOrderPricing,
  calculateOnlineAdoptionMetrics,
  buildSubscriptionWindow,
  buildSubscriptionHistoryEntry
};
