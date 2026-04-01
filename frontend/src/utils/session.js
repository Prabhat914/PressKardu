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
