import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { buildFallbackShops, enrichShopCollection, DEFAULT_LOCATION } from "../utils/pressShops";
import { getStatusLabel } from "../utils/orderMeta";
import { getFavoriteShopIds, getStoredUser, saveSession } from "../utils/session";
import { startHostedPayment } from "../utils/payment";
import Toast from "../components/Toast";

function Dashboard() {
  const initialUser = getStoredUser();
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [orders, setOrders] = useState([]);
  const [shops, setShops] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [subscriptionMessage, setSubscriptionMessage] = useState("");
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
    phoneOtpVerified: false,
    payoutAccountHolderName: "",
    payoutUpiId: "",
    payoutBankName: "",
    payoutAccountNumber: "",
    payoutIfscCode: "",
    payoutNotes: ""
  });

  const applyProfilePayload = (profile) => {
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
      phoneOtpVerified: false,
      payoutAccountHolderName: profile.pressShop?.payoutDetails?.accountHolderName || "",
      payoutUpiId: profile.pressShop?.payoutDetails?.upiId || "",
      payoutBankName: profile.pressShop?.payoutDetails?.bankName || "",
      payoutAccountNumber: profile.pressShop?.payoutDetails?.accountNumber || "",
      payoutIfscCode: profile.pressShop?.payoutDetails?.ifscCode || "",
      payoutNotes: profile.pressShop?.payoutDetails?.notes || ""
    });
    setSubscriptionPlans(Array.isArray(profile.subscriptionPlans) ? profile.subscriptionPlans : []);
    setPaymentCapabilities(profile.paymentCapabilities || null);
  };

  const refreshProfile = async () => {
    const profileRes = await API.get("/user/profile");
    applyProfilePayload(profileRes.data);
    return profileRes.data;
  };

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
        setMessage(getApiErrorMessage(error, "The dashboard could not be loaded right now."));
      }
    };

    loadDashboardData();
    const intervalId = window.setInterval(loadDashboardData, 20000);

    return () => window.clearInterval(intervalId);
  }, [currentUser?.role]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        await refreshProfile();
      } catch (error) {
        setProfileMessage(getApiErrorMessage(error, "Profile details could not be loaded."));
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
      setProfileMessage("Enter a phone number before sending an OTP.");
      return;
    }

    try {
      setOtpSending(true);
      const res = await API.post("/auth/phone-verification/send-otp", {
        phone: profileForm.phone
      });
      setProfileMessage(res.data.deliveryHint || res.data.message || "OTP sent.");
      setSubscriptionMessage("");
    } catch (error) {
      setProfileMessage(getApiErrorMessage(error, "The phone OTP could not be sent."));
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!profileForm.phone.trim() || !profileForm.phoneOtp.trim()) {
      setProfileMessage("Enter both phone number and OTP.");
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
      setSubscriptionMessage("");
    } catch (error) {
      setProfileForm((current) => ({
        ...current,
        phoneOtpVerified: false
      }));
      setProfileMessage(getApiErrorMessage(error, "The phone OTP could not be verified."));
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();

    if (phoneNeedsVerification && !profileForm.phoneOtpVerified) {
      setProfileMessage("Verify the new phone number before saving it.");
      setSubscriptionMessage("");
      return;
    }

    setSavingProfile(true);
    setProfileMessage("");
    setSubscriptionMessage("");

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
          services: profileForm.services.split(",").map((item) => item.trim()).filter(Boolean),
          payoutDetails: {
            accountHolderName: profileForm.payoutAccountHolderName,
            upiId: profileForm.payoutUpiId,
            bankName: profileForm.payoutBankName,
            accountNumber: profileForm.payoutAccountNumber,
            ifscCode: profileForm.payoutIfscCode,
            notes: profileForm.payoutNotes
          }
        });
      }

      const res = await API.put("/user/profile", payload);
      applyProfilePayload(res.data);
      setProfileMessage(
        res.data.pressShop?.verificationStatus === "pending"
          ? "Profile updated. The shop is still pending review."
          : "Profile updated successfully. Approved shops will not automatically return to pending."
      );
    } catch (error) {
      setProfileMessage(getApiErrorMessage(error, "The profile could not be updated."));
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
  const settledPayoutOrders = orders.filter((order) => order.payoutStatus === "settled");
  const pendingPayoutOrders = orders.filter((order) => order.payoutStatus === "pending");
  const pendingPayoutAmount = pendingPayoutOrders.reduce((sum, order) => sum + Number(order.pricing?.shopEarning || 0), 0);
  const settledPayoutAmount = settledPayoutOrders.reduce((sum, order) => sum + Number(order.payoutSettlement?.amount || order.pricing?.shopEarning || 0), 0);
  const payoutDestinationPreview = profileForm.payoutUpiId
    ? `UPI: ${profileForm.payoutUpiId}`
    : profileForm.payoutAccountNumber && profileForm.payoutIfscCode
    ? `${profileForm.payoutBankName || "Bank"} ending ${profileForm.payoutAccountNumber.slice(-4)} (${profileForm.payoutIfscCode})`
    : "";

  const handleSubscriptionChange = async (planId, paymentMode) => {
    try {
      setSubscriptionLoading(`${planId}:${paymentMode}`);
      setSubscriptionMessage("");
      setProfileMessage("");
      const res = await API.put("/user/subscription", {
        planId,
        paymentMode
      });

      if (paymentMode === "online" && res.data.paymentSession) {
        if (res.data.paymentSession.provider !== "razorpay") {
          setSubscriptionMessage("The online payment gateway is not ready yet. Use an offline request for now.");
          return;
        }

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

        await refreshProfile();
        setSubscriptionMessage("Subscription payment verified and plan activated.");
      } else {
        await refreshProfile();
        setSubscriptionMessage(res.data.message || "Subscription updated.");
      }
    } catch (error) {
      setSubscriptionMessage(getApiErrorMessage(error, "The subscription could not be updated."));
    } finally {
      setSubscriptionLoading("");
    }
  };

  const actionToastMessage = subscriptionMessage || profileMessage;
  const actionToastTone = actionToastMessage && !/(error|invalid|required|unavailable|failed|missing|could not)/i.test(actionToastMessage)
    ? "success"
    : "warning";

  return (
    <main className="dashboard-page">
      <Toast message={actionToastMessage} tone={actionToastTone} />
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
              <p className="dashboard-empty">New alerts will appear here when order status, payment, or tracking changes.</p>
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
            {paymentCapabilities?.subscription?.status === "pending" && (
              <p className="auth-card__message">
                Selected plan is pending activation. Complete payment or wait for admin confirmation.
              </p>
            )}
            {subscriptionMessage && <p className="auth-card__message">{subscriptionMessage}</p>}
            <div className="offer-stack">
              {subscriptionPlans.map((plan) => {
                const isCurrentPlan = paymentCapabilities?.subscription?.plan?.id === plan.id;
                const disableOnlineButton =
                  Boolean(subscriptionLoading) ||
                  !paymentCapabilities?.hostedCheckoutAvailable;
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
                            disabled={disableOnlineButton}
                            onClick={() => handleSubscriptionChange(plan.id, "online")}
                          >
                            {!paymentCapabilities?.hostedCheckoutAvailable
                              ? "Online setup soon"
                              : subscriptionLoading === `${plan.id}:online`
                              ? "Opening..."
                              : "Pay online"}
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

        {currentUser?.role === "presswala" && (
          <article className="dashboard-card">
            <p className="dashboard-eyebrow">Money flow</p>
            <h2>Payout tracking</h2>
            <div className="offer-stack">
              <div className="offer-card">
                <strong>Customer pays</strong>
                <span>Online amount first reaches the platform gateway account.</span>
              </div>
              <div className="offer-card">
                <strong>Platform fee</strong>
                <span>Commission is auto-calculated from your active membership plan.</span>
              </div>
              <div className="offer-card">
                <strong>Shop payout</strong>
                <span>{payoutDestinationPreview || "Add UPI or bank details below so admin can settle payouts."}</span>
              </div>
              <div className="offer-card">
                <strong>Rs. {pendingPayoutAmount}</strong>
                <span>Pending payout amount across {pendingPayoutOrders.length} paid orders.</span>
              </div>
              <div className="offer-card">
                <strong>Rs. {settledPayoutAmount}</strong>
                <span>Already marked settled across {settledPayoutOrders.length} orders.</span>
              </div>
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
                      <span>Verify the new phone number before saving profile changes.</span>
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
                  Changing phone, address, or map coordinates will not automatically move the shop back to pending. Admins can still review manually.
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

                <div className="auth-section">
                  <div className="auth-section__head">
                    <strong>Payout account</strong>
                    <span>Customer online payments first reach the platform account. Save UPI or bank details here so admins can settle shop payouts.</span>
                  </div>

                  <div className="auth-form__split">
                    <label className="auth-field">
                      <span className="auth-field__label">Account holder name</span>
                      <input className="auth-field__input" name="payoutAccountHolderName" value={profileForm.payoutAccountHolderName} onChange={handleProfileChange} placeholder="Owner full name" />
                    </label>
                    <label className="auth-field">
                      <span className="auth-field__label">UPI ID</span>
                      <input className="auth-field__input" name="payoutUpiId" value={profileForm.payoutUpiId} onChange={handleProfileChange} placeholder="name@bank" />
                    </label>
                  </div>

                  <div className="auth-form__split">
                    <label className="auth-field">
                      <span className="auth-field__label">Bank name</span>
                      <input className="auth-field__input" name="payoutBankName" value={profileForm.payoutBankName} onChange={handleProfileChange} placeholder="Bank name" />
                    </label>
                    <label className="auth-field">
                      <span className="auth-field__label">Account number</span>
                      <input className="auth-field__input" name="payoutAccountNumber" value={profileForm.payoutAccountNumber} onChange={handleProfileChange} placeholder="Account number" />
                    </label>
                  </div>

                  <div className="auth-form__split">
                    <label className="auth-field">
                      <span className="auth-field__label">IFSC code</span>
                      <input className="auth-field__input" name="payoutIfscCode" value={profileForm.payoutIfscCode} onChange={handleProfileChange} placeholder="SBIN0001234" />
                    </label>
                    <label className="auth-field">
                      <span className="auth-field__label">Payout note</span>
                      <input className="auth-field__input" name="payoutNotes" value={profileForm.payoutNotes} onChange={handleProfileChange} placeholder="Preferred settlement note" />
                    </label>
                  </div>
                </div>
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
            {orders.length === 0 && <p className="dashboard-empty">Orders will appear here once you start booking.</p>}
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
              <p className="dashboard-empty">Save favorite shops here for faster repeat bookings.</p>
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
