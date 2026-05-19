const GUEST_DEMO_KEY = "presskardu_guest_demo";

export function getStoredUser() {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem("token"));
}

export function saveSession({ token, user }) {
  localStorage.removeItem(GUEST_DEMO_KEY);

  if (token) {
    localStorage.setItem("token", token);
  }

  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function enableGuestDemo() {
  clearSession();
  localStorage.setItem(GUEST_DEMO_KEY, "1");
}

export function disableGuestDemo() {
  localStorage.removeItem(GUEST_DEMO_KEY);
}

export function isGuestDemo() {
  return localStorage.getItem(GUEST_DEMO_KEY) === "1";
}

export function getFavoriteShopIds() {
  const stored = localStorage.getItem("favoriteShopIds");
  return stored ? JSON.parse(stored) : [];
}

export function toggleFavoriteShopId(shopId) {
  const current = new Set(getFavoriteShopIds());

  if (current.has(shopId)) {
    current.delete(shopId);
  } else {
    current.add(shopId);
  }

  const next = Array.from(current);
  localStorage.setItem("favoriteShopIds", JSON.stringify(next));
  return next;
}
