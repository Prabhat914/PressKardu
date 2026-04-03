const SUBSCRIPTION_PLANS = {
  basic: {
    id: "basic",
    name: "Basic",
    monthlyPrice: 0,
    supportsOnlinePayments: false,
    supportsOfflinePayments: true,
    monthlyOrderLimit: 20,
    orderLimitLabel: "20 active orders per month",
    onlineCommissionRate: 0
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPrice: 299,
    supportsOnlinePayments: true,
    supportsOfflinePayments: true,
    monthlyOrderLimit: null,
    orderLimitLabel: "Unlimited orders",
    onlineCommissionRate: 0.08
  },
  premium: {
    id: "premium",
    name: "Premium",
    monthlyPrice: 699,
    supportsOnlinePayments: true,
    supportsOfflinePayments: true,
    monthlyOrderLimit: null,
    orderLimitLabel: "Unlimited orders + top placement",
    onlineCommissionRate: 0.05
  }
};

function getSubscriptionPlan(planId) {
  return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.basic;
}

function listSubscriptionPlans() {
  return Object.values(SUBSCRIPTION_PLANS);
}

module.exports = {
  SUBSCRIPTION_PLANS,
  getSubscriptionPlan,
  listSubscriptionPlans
};
