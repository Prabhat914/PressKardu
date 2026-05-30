const CART_KEY = "presskardu_cart";

function normalizeCartItem(item) {
  const shop = item?.shop || item;
  const clothesCount = Number(item?.clothesCount || 5);

  return {
    shop: {
      _id: shop?._id,
      shopName: shop?.shopName || "Press shop",
      address: shop?.address || "",
      phone: shop?.phone || "",
      pricePerCloth: Number(shop?.pricePerCloth || 0),
      subscriptionPlan: shop?.subscriptionPlan,
      subscriptionStatus: shop?.subscriptionStatus,
      marketplaceSignals: shop?.marketplaceSignals || null
    },
    clothesCount: Number.isFinite(clothesCount) && clothesCount > 0 ? clothesCount : 5,
    clothType: item?.clothType || "Daily wear",
    serviceType: item?.serviceType || "Steam press",
    addedAt: item?.addedAt || new Date().toISOString()
  };
}

export function getCartItems() {
  const stored = localStorage.getItem(CART_KEY);

  if (!stored) {
    return [];
  }

  try {
    const items = JSON.parse(stored);
    return Array.isArray(items) ? items.map(normalizeCartItem).filter((item) => item.shop._id) : [];
  } catch {
    localStorage.removeItem(CART_KEY);
    return [];
  }
}

export function saveCartItems(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items.map(normalizeCartItem)));
}

export function addShopToCart(shop, options = {}) {
  const nextItem = normalizeCartItem({ shop, ...options, addedAt: new Date().toISOString() });
  const current = getCartItems();
  const withoutSameShop = current.filter((item) => item.shop._id !== nextItem.shop._id);
  const next = [nextItem, ...withoutSameShop].slice(0, 8);
  saveCartItems(next);
  window.dispatchEvent(new Event("presskardu-cart-change"));
  return next;
}

export function removeCartItem(shopId) {
  const next = getCartItems().filter((item) => item.shop._id !== shopId);
  saveCartItems(next);
  window.dispatchEvent(new Event("presskardu-cart-change"));
  return next;
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event("presskardu-cart-change"));
}
