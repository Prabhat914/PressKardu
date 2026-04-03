import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { buildFallbackShops, enrichShopCollection, DEFAULT_LOCATION } from "../utils/pressShops";
import { getStatusLabel } from "../utils/orderMeta";
import { getFavoriteShopIds, getStoredUser, saveSession } from "../utils/session";
import { startHostedPayment } from "../utils/payment";

function Dashboard() {
  const initialUser = getStoredUser();
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [orders, setOrders] = useState([]);
  const [shops, setShops] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [paymentCapabilities, setPaymentCapabilities] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState("");
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
    services: "",
    verificationStatus: "",
    verificationNotes: "",
    fraudSignals: "",
    shopPhotoDataUrl: "",
    phoneVerifiedAt: "",
    phoneOtp: "",
    phoneOtpVerified: false
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
          services: Array.isArray(profile.pressShop?.services) ? profile.pressShop.services.join(", ") : "",
          verificationStatus: profile.pressShop?.verificationStatus || "",
          verificationNotes: profile.pressShop?.verificationNotes || "",
          fraudSignals: Array.isArray(profile.pressShop?.fraudSignals) ? profile.pressShop.fraudSignals.join(" | ") : "",
          shopPhotoDataUrl: profile.pressShop?.shopPhotoDataUrl || "",
          phoneVerifiedAt: profile.pressShop?.phoneVerifiedAt || "",
          phoneOtp: "",
          phoneOtpVerified: false
        });
        setSubscriptionPlans(Array.isArray(profile.subscriptionPlans) ? profile.subscriptionPlans : []);
        setPaymentCapabilities(profile.paymentCapabilities || null);
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
      [name]: value,
      ...(name === "phone" ? { phoneOtpVerified: false } : {})
    }));
  };

  const handleSendPhoneOtp = async () => {
    if (!profileForm.phone.trim()) {
      setProfileMessage("Phone number enter karo, phir OTP bhejo.");
      return;
    }

    try {
      setOtpSending(true);
      const res = await API.post("/auth/phone-verification/send-otp", {
        phone: profileForm.phone
      });
      setProfileMessage(res.data.deliveryHint || res.data.message || "OTP sent.");
    } catch (error) {
      setProfileMessage(getApiErrorMessage(error, "Phone OTP bhejna possible nahi hua."));
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!profileForm.phone.trim() || !profileForm.phoneOtp.trim()) {
      setProfileMessage("Phone number aur OTP dono enter karo.");
      return;
    }

    try {
      setOtpVerifying(true);
      const res = await API.post("/auth/phone-verification/verify-otp", {
        phone: profileForm.phone,
        otp: profileForm.phoneOtp
      });
      setProfileForm((current) => ({
        ...current,
        phoneOtpVerified: true
      }));
      setProfileMessage(res.data.message || "Phone verified.");
    } catch (error) {
      setProfileForm((current) => ({
        ...current,
        phoneOtpVerified: false
      }));
      setProfileMessage(getApiErrorMessage(error, "Phone OTP verify nahi hua."));
    } finally {
      setOtpVerifying(false);
    }
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
      setPaymentCapabilities(res.data.paymentCapabilities || paymentCapabilities);
      setProfileForm((current) => ({
        ...current,
        name: res.data.user?.name || current.name,
        phone: res.data.user?.phone || "",
        verificationStatus: res.data.pressShop?.verificationStatus || current.verificationStatus,
        verificationNotes: res.data.pressShop?.verificationNotes || "",
        fraudSignals: Array.isArray(res.data.pressShop?.fraudSignals) ? res.data.pressShop.fraudSignals.join(" | ") : current.fraudSignals,
        shopPhotoDataUrl: res.data.pressShop?.shopPhotoDataUrl || current.shopPhotoDataUrl,
        phoneVerifiedAt: res.data.pressShop?.phoneVerifiedAt || current.phoneVerifiedAt,
        phoneOtp: "",
        phoneOtpVerified: false
      }));
      setProfileMessage(
        res.data.pressShop?.verificationStatus === "pending"
          ? "Profile updated. Shop abhi pending state me hi hai."
          : "Profile updated successfully. Approved shops auto-pending me wapas nahi jayengi."
      );
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
  const phoneNeedsVerification = currentUser?.role === "presswala" && profileForm.phone.trim() !== (currentUser?.phone || "").trim();
  const onlineOrders = orders.filter((order) => order.paymentMode === "online");
  const offlineOrders = orders.filter((order) => order.paymentMode === "offline");
  const onlineRatio = orders.length > 0 ? Math.round((onlineOrders.length / orders.length) * 100) : 0;
  const loyaltyPoints = orders.reduce((sum, order) => sum + Number(order.customerBenefits?.loyaltyPointsEarned || 0), 0);
  const currentPlanId = paymentCapabilities?.subscription?.plan?.id || "basic";
  const currentPlanConfig = subscriptionPlans.find((plan) => plan.id === currentPlanId);
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const currentMonthCount = orders.filter((order) => {
    if (!order?.createdAt) {
      return false;
    }

    return new Date(order.createdAt) >= currentMonthStart && !["cancelled", "rejected"].includes(order.status);
  }).length;
  const currentPlanOrderLimit = Number(currentPlanConfig?.monthlyOrderLimit || 0);
  const currentPlanRemainingOrders = currentPlanOrderLimit > 0 ? Math.max(0, currentPlanOrderLimit - currentMonthCount) : null;

  const handleSubscriptionChange = async (planId, paymentMode) => {
    try {
      setSubscriptionLoading(`${planId}:${paymentMode}`);
      const res = await API.put("/user/subscription", {
        planId,
        paymentMode
      });

      if (paymentMode === "online" && res.data.paymentSession) {
        await startHostedPayment({
          session: res.data.paymentSession,
          customer: currentUser,
          onSuccess: async (paymentResult) => {
            await API.post("/user/subscription/verify-payment", {
              gatewayOrderId: paymentResult.razorpay_order_id,
              gatewayPaymentId: paymentResult.razorpay_payment_id,
              signature: paymentResult.razorpay_signature
            });
          }
        });

        const profileRes = await API.get("/user/profile");
        setCurrentUser(profileRes.data.user);
        saveSession({ user: profileRes.data.user });
        setPaymentCapabilities(profileRes.data.paymentCapabilities || null);
        setSubscriptionPlans(Array.isArray(profileRes.data.subscriptionPlans) ? profileRes.data.subscriptionPlans : []);
        setProfileForm((current) => ({
          ...current,
          verificationStatus: profileRes.data.pressShop?.verificationStatus || current.verificationStatus
        }));
        setProfileMessage("Subscription payment verified and plan activated.");
      } else {
        setPaymentCapabilities(res.data.paymentCapabilities || null);
        setProfileMessage(res.data.message || "Subscription updated.");
      }
    } catch (error) {
      setProfileMessage(getApiErrorMessage(error, "Subscription update nahi ho paaya."));
    } finally {
      setSubscriptionLoading("");
    }
  };

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Personal workspace</p>
          <h1>{currentUser?.role === "presswala" ? "Run your press shop with more clarity" : "Everything you need in one clean dashboard"}</h1>
          <p>
            Track orders, notifications, savings, and your preferred shops without leaving PressKardu.
          </p>
          {currentUser?.role === "presswala" && (
            <p className="auth-card__message">
              Shop status: {profileForm.verificationStatus || "pending"}
            </p>
          )}
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
        {currentUser?.role === "presswala" ? (
          <article className="dashboard-card">
            <span className="dashboard-card__label">Online ratio</span>
            <strong>{onlineRatio}%</strong>
            <p>Higher online payment acceptance improves ranking and payout priority.</p>
          </article>
        ) : (
          <article className="dashboard-card">
            <span className="dashboard-card__label">Loyalty points</span>
            <strong>{loyaltyPoints}</strong>
            <p>Prepaid online orders earn points and stronger order protection.</p>
          </article>
        )}
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
        {currentUser?.role === "presswala" && (
          <article className="dashboard-card dashboard-card--wide">
            <p className="dashboard-eyebrow">Subscription</p>
            <h2>Plan and payment access</h2>
            <p className="auth-card__message">
              Current plan: <strong>{paymentCapabilities?.subscription?.plan?.name || "Basic"}</strong>
              {paymentCapabilities?.subscription?.expiresAt
                ? ` | Active till ${new Date(paymentCapabilities.subscription.expiresAt).toLocaleDateString()}`
                : " | Free plan"}
            </p>
            {currentPlanOrderLimit > 0 && (
              <p className="auth-card__message">
                Basic usage this month: <strong>{currentMonthCount}/{currentPlanOrderLimit}</strong>
                {` | ${currentPlanRemainingOrders} order slots remaining`}
              </p>
            )}
            <div className="offer-stack">
              {subscriptionPlans.map((plan) => {
                const isCurrentPlan = paymentCapabilities?.subscription?.plan?.id === plan.id;
                return (
                  <div key={plan.id} className="offer-card">
                    <strong>{plan.name}</strong>
                    <span>{plan.monthlyPrice === 0 ? "Free" : `Rs. ${plan.monthlyPrice}/month`}</span>
                    <span>{plan.supportsOnlinePayments ? "Online + offline payments" : "Offline payments only"}</span>
                    <span>{plan.orderLimitLabel}</span>
                    <span>{plan.monthlyOrderLimit ? `${plan.monthlyOrderLimit} active orders per month` : "No monthly order cap"}</span>
                    <span>{plan.supportsOnlinePayments ? "Better ranking from online adoption" : "No online conversion boost"}</span>
                    <div className="auth-location-card__actions">
                      {plan.id === "basic" ? (
                        <button
                          type="button"
                          className="auth-form__secondary"
                          disabled={subscriptionLoading === `${plan.id}:free` || isCurrentPlan}
                          onClick={() => handleSubscriptionChange("basic", "free")}
                        >
                          {isCurrentPlan ? "Current plan" : "Switch to Basic"}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="auth-form__secondary"
                            disabled={Boolean(subscriptionLoading)}
                            onClick={() => handleSubscriptionChange(plan.id, "online")}
                          >
                            {subscriptionLoading === `${plan.id}:online` ? "Opening..." : "Pay online"}
                          </button>
                          <button
                            type="button"
                            className="auth-form__secondary"
                            disabled={Boolean(subscriptionLoading)}
                            onClick={() => handleSubscriptionChange(plan.id, "offline")}
                          >
                            {subscriptionLoading === `${plan.id}:offline` ? "Requesting..." : "Request offline"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        )}

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

                <p className="auth-card__message">
                  Public status: <strong>{profileForm.verificationStatus || "pending"}</strong>
                  {profileForm.verificationNotes ? ` | ${profileForm.verificationNotes}` : ""}
                </p>
                {profileForm.fraudSignals && (
                  <p className="auth-card__message">Review flags: {profileForm.fraudSignals}</p>
                )}
                {profileForm.phoneVerifiedAt && (
                  <p className="auth-card__message">Phone verified on: {new Date(profileForm.phoneVerifiedAt).toLocaleString()}</p>
                )}
                {phoneNeedsVerification && (
                  <div className="auth-location-card">
                    <div className="auth-location-card__head">
                      <strong>{profileForm.phoneOtpVerified ? "New phone verified" : "Verify new phone"}</strong>
                      <span>Phone number badalne ke baad save se pehle OTP verify karna zaroori hai.</span>
                    </div>
                    <div className="auth-form__split">
                      <label className="auth-field">
                        <span className="auth-field__label">OTP</span>
                        <input className="auth-field__input" name="phoneOtp" value={profileForm.phoneOtp} onChange={handleProfileChange} placeholder="Enter OTP" />
                      </label>
                    </div>
                    <div className="auth-location-card__actions">
                      <button className="auth-form__secondary" type="button" onClick={handleSendPhoneOtp} disabled={otpSending}>
                        {otpSending ? "Sending..." : "Send OTP"}
                      </button>
                      <button className="auth-form__secondary" type="button" onClick={handleVerifyPhoneOtp} disabled={otpVerifying}>
                        {otpVerifying ? "Verifying..." : "Verify OTP"}
                      </button>
                    </div>
                  </div>
                )}
                {profileForm.shopPhotoDataUrl && (
                  <img src={profileForm.shopPhotoDataUrl} alt="Shop" style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "20px", marginBottom: "1rem" }} />
                )}

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

                <p className="auth-card__message">
                  Changing phone, address, ya map coordinates ab shop ko auto-pending me nahi bhejega. Admin chahe to manual review kar sakta hai.
                </p>

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
            <button type="submit" disabled={savingProfile || (phoneNeedsVerification && !profileForm.phoneOtpVerified)}>
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
        {currentUser?.role === "presswala" && (
          <article className="dashboard-card">
            <p className="dashboard-eyebrow">Adoption</p>
            <h2>Payment behavior</h2>
            <div className="offer-stack">
              <div className="offer-card">
                <strong>{onlineOrders.length}</strong>
                <span>Online orders with ranking and priority benefits.</span>
              </div>
              <div className="offer-card">
                <strong>{offlineOrders.length}</strong>
                <span>Offline orders stay allowed but do not improve featured visibility.</span>
              </div>
              <div className="offer-card">
                <strong>{paymentCapabilities?.subscription?.plan?.name || "Basic"}</strong>
                <span>{onlineRatio >= 45 ? "Strong online adoption keeps you competitive." : "Grow prepaid orders to improve ranking."}</span>
              </div>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}

export default Dashboard;
