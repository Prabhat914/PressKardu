import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { buildFallbackShops, enrichShopCollection, DEFAULT_LOCATION } from "../utils/pressShops";
import { getStatusLabel } from "../utils/orderMeta";
import { getFavoriteShopIds, getStoredUser, saveSession } from "../utils/session";

function Dashboard() {
  const initialUser = getStoredUser();
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [orders, setOrders] = useState([]);
  const [shops, setShops] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: initialUser?.name || "",
    phone: initialUser?.phone || "",
    shopName: "",
    address: "",
    specialty: "",
    eta: "",
    pickupWindow: "",
    about: "",
    pricePerCloth: "",
    serviceRadiusKm: "",
    latitude: "",
    longitude: "",
    services: ""
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [ordersRes, shopsRes, notificationsRes] = await Promise.allSettled([
          API.get(currentUser?.role === "presswala" ? "/orders/shop" : "/orders/my"),
          API.get("/press"),
          API.get("/notifications")
        ]);

        if (ordersRes.status === "fulfilled") {
          setOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : []);
        }

        if (shopsRes.status === "fulfilled") {
          setShops(Array.isArray(shopsRes.value.data) ? shopsRes.value.data : []);
        } else {
          setShops(enrichShopCollection(buildFallbackShops(DEFAULT_LOCATION), DEFAULT_LOCATION));
        }

        if (notificationsRes.status === "fulfilled") {
          setNotifications(Array.isArray(notificationsRes.value.data) ? notificationsRes.value.data : []);
        }

        if (ordersRes.status === "rejected" && shopsRes.status === "rejected") {
          setMessage("Live dashboard data unavailable, showing planning-friendly recommendations instead.");
        }
      } catch (error) {
        setMessage(getApiErrorMessage(error, "Dashboard abhi load nahi ho pa raha."));
      }
    };

    loadDashboardData();
    const intervalId = window.setInterval(loadDashboardData, 20000);

    return () => window.clearInterval(intervalId);
  }, [currentUser?.role]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileRes = await API.get("/user/profile");
        const profile = profileRes.data;
        setCurrentUser(profile.user);
        saveSession({ user: profile.user });
        setProfileForm({
          name: profile.user?.name || "",
          phone: profile.user?.phone || "",
          shopName: profile.pressShop?.shopName || "",
          address: profile.pressShop?.address || "",
          specialty: profile.pressShop?.specialty || "",
          eta: profile.pressShop?.eta || "",
          pickupWindow: profile.pressShop?.pickupWindow || "",
          about: profile.pressShop?.about || "",
          pricePerCloth: profile.pressShop?.pricePerCloth ?? "",
          serviceRadiusKm: profile.pressShop?.serviceRadiusKm ?? "",
          latitude: profile.pressShop?.location?.coordinates?.[1] ?? "",
          longitude: profile.pressShop?.location?.coordinates?.[0] ?? "",
          services: Array.isArray(profile.pressShop?.services) ? profile.pressShop.services.join(", ") : ""
        });
      } catch (error) {
        setProfileMessage(getApiErrorMessage(error, "Profile details load nahi ho paaye."));
      }
    };

    loadProfile();
  }, []);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");

    try {
      const payload = {
        name: profileForm.name,
        phone: profileForm.phone
      };

      if (currentUser?.role === "presswala") {
        Object.assign(payload, {
          shopName: profileForm.shopName,
          address: profileForm.address,
          specialty: profileForm.specialty,
          eta: profileForm.eta,
          pickupWindow: profileForm.pickupWindow,
          about: profileForm.about,
          pricePerCloth: profileForm.pricePerCloth === "" ? undefined : Number(profileForm.pricePerCloth),
          serviceRadiusKm: profileForm.serviceRadiusKm === "" ? undefined : Number(profileForm.serviceRadiusKm),
          latitude: profileForm.latitude === "" ? undefined : Number(profileForm.latitude),
          longitude: profileForm.longitude === "" ? undefined : Number(profileForm.longitude),
          services: profileForm.services.split(",").map((item) => item.trim()).filter(Boolean)
        });
      }

      const res = await API.put("/user/profile", payload);
      setCurrentUser(res.data.user);
      saveSession({ user: res.data.user });
      setProfileForm((current) => ({
        ...current,
        name: res.data.user?.name || current.name,
        phone: res.data.user?.phone || ""
      }));
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileMessage(getApiErrorMessage(error, "Profile update nahi ho paaya."));
    } finally {
      setSavingProfile(false);
    }
  };

  const favoriteIds = getFavoriteShopIds();
  const favoriteShops = shops.filter((shop) => favoriteIds.includes(shop._id));
  const activeOrders = orders.filter((order) => !["completed", "cancelled"].includes(order.status));
  const completedOrders = orders.filter((order) => order.status === "completed");
  const totalSpend = orders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
  const referralCode = `${(currentUser?.name || "PRESS").slice(0, 5).toUpperCase()}20`;

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Personal workspace</p>
          <h1>{currentUser?.role === "presswala" ? "Run your press shop with more clarity" : "Everything you need in one clean dashboard"}</h1>
          <p>
            Track orders, notifications, savings, and your preferred shops without leaving PressKardu.
          </p>
        </div>
        <div className="dashboard-hero__cta">
          <Link className="home-shops__link" to={currentUser?.role === "presswala" ? "/orders" : "/shops"}>
            {currentUser?.role === "presswala" ? "Manage orders" : "Book another service"}
          </Link>
        </div>
      </section>

      {message && <p className="orders-page__state">{message}</p>}

      <section className="dashboard-grid dashboard-grid--stats">
        <article className="dashboard-card">
          <span className="dashboard-card__label">Active orders</span>
          <strong>{activeOrders.length}</strong>
          <p>Orders currently moving through pickup, press, or delivery.</p>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card__label">Completed</span>
          <strong>{completedOrders.length}</strong>
          <p>Finished jobs ready for repeat booking and reorders.</p>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card__label">Total value</span>
          <strong>Rs. {totalSpend}</strong>
          <p>{currentUser?.role === "presswala" ? "Revenue tracked from your current order feed." : "Amount spent across your orders so far."}</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card dashboard-card--wide">
          <div className="dashboard-card__head">
            <div>
              <p className="dashboard-eyebrow">Live notifications</p>
              <h2>Recent updates</h2>
            </div>
          </div>
          <div className="notification-list">
            {notifications.map((item) => (
              <article key={item._id} className={`notification-item notification-item--${item.type === "payment" ? "success" : "info"}`}>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </article>
            ))}
            {notifications.length === 0 && (
              <p className="dashboard-empty">New alerts yahan show hongi when order status, payment, or tracking changes.</p>
            )}
          </div>
        </article>

        <article className="dashboard-card">
          <p className="dashboard-eyebrow">Offers</p>
          <h2>Coupons and referral</h2>
          <div className="offer-stack">
            <div className="offer-card">
              <strong>WELCOME20</strong>
              <span>20% off on the first order above Rs. 199</span>
            </div>
            <div className="offer-card">
              <strong>{referralCode}</strong>
              <span>Refer friends and earn a discount on your next booking.</span>
            </div>
            <div className="offer-card">
              <strong>FESTIVEPRESS</strong>
              <span>Free pickup on premium garments this week.</span>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card dashboard-card--wide">
          <p className="dashboard-eyebrow">Profile</p>
          <h2>{currentUser?.role === "presswala" ? "Account and shop settings" : "Account settings"}</h2>
          <form className="auth-form" onSubmit={handleProfileSave}>
            <div className="auth-form__split">
              <label className="auth-field">
                <span className="auth-field__label">Name</span>
                <input className="auth-field__input" name="name" value={profileForm.name} onChange={handleProfileChange} />
              </label>
              <label className="auth-field">
                <span className="auth-field__label">Phone</span>
                <input className="auth-field__input" name="phone" value={profileForm.phone} onChange={handleProfileChange} />
              </label>
            </div>

            {currentUser?.role === "presswala" && (
              <>
                <div className="auth-form__split">
                  <label className="auth-field">
                    <span className="auth-field__label">Shop name</span>
                    <input className="auth-field__input" name="shopName" value={profileForm.shopName} onChange={handleProfileChange} />
                  </label>
                  <label className="auth-field">
                    <span className="auth-field__label">Address</span>
                    <input className="auth-field__input" name="address" value={profileForm.address} onChange={handleProfileChange} />
                  </label>
                </div>

                <div className="auth-form__split">
                  <label className="auth-field">
                    <span className="auth-field__label">Price per cloth</span>
                    <input className="auth-field__input" name="pricePerCloth" type="number" min="0" value={profileForm.pricePerCloth} onChange={handleProfileChange} />
                  </label>
                  <label className="auth-field">
                    <span className="auth-field__label">Service radius (km)</span>
                    <input className="auth-field__input" name="serviceRadiusKm" type="number" min="1" value={profileForm.serviceRadiusKm} onChange={handleProfileChange} />
                  </label>
                </div>

                <div className="auth-form__split">
                  <label className="auth-field">
                    <span className="auth-field__label">Latitude</span>
                    <input className="auth-field__input" name="latitude" value={profileForm.latitude} onChange={handleProfileChange} />
                  </label>
                  <label className="auth-field">
                    <span className="auth-field__label">Longitude</span>
                    <input className="auth-field__input" name="longitude" value={profileForm.longitude} onChange={handleProfileChange} />
                  </label>
                </div>

                <div className="auth-form__split">
                  <label className="auth-field">
                    <span className="auth-field__label">Specialty</span>
                    <input className="auth-field__input" name="specialty" value={profileForm.specialty} onChange={handleProfileChange} />
                  </label>
                  <label className="auth-field">
                    <span className="auth-field__label">ETA</span>
                    <input className="auth-field__input" name="eta" value={profileForm.eta} onChange={handleProfileChange} />
                  </label>
                </div>

                <label className="auth-field">
                  <span className="auth-field__label">Pickup window</span>
                  <input className="auth-field__input" name="pickupWindow" value={profileForm.pickupWindow} onChange={handleProfileChange} />
                </label>
                <label className="auth-field">
                  <span className="auth-field__label">Services</span>
                  <input className="auth-field__input" name="services" value={profileForm.services} onChange={handleProfileChange} placeholder="Steam press, Dry clean, Wash and iron" />
                </label>
                <label className="auth-field">
                  <span className="auth-field__label">About</span>
                  <input className="auth-field__input" name="about" value={profileForm.about} onChange={handleProfileChange} />
                </label>
              </>
            )}

            {profileMessage && <p className="auth-card__message">{profileMessage}</p>}
            <button type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>
        </article>

        <article className="dashboard-card dashboard-card--wide">
          <p className="dashboard-eyebrow">Recent orders</p>
          <h2>{currentUser?.role === "presswala" ? "Queue snapshot" : "Your latest requests"}</h2>
          <div className="dashboard-order-list">
            {orders.slice(0, 4).map((order) => (
              <div key={order._id} className="dashboard-order-item">
                <div>
                  <strong>{order.pressShop?.shopName || "Press shop"}</strong>
                  <p>{order.pickupAddress}</p>
                </div>
                <span>{getStatusLabel(order.status)}</span>
              </div>
            ))}
            {orders.length === 0 && <p className="dashboard-empty">Orders yahan show honge once you start booking.</p>}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <p className="dashboard-eyebrow">Saved shops</p>
          <h2>Favorites</h2>
          <div className="favorite-list">
            {favoriteShops.slice(0, 4).map((shop) => (
              <Link key={shop._id} className="favorite-item" to={`/shops/${shop._id}`}>
                <strong>{shop.shopName}</strong>
                <span>{shop.address}</span>
              </Link>
            ))}
            {favoriteShops.length === 0 && (
              <p className="dashboard-empty">Favorite shops save karke quick rebooking yahan pao.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

export default Dashboard;
