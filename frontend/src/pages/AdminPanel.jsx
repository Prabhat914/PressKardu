import { useEffect, useState } from "react";
import API from "../services/api";
import LoadingCards from "../components/LoadingCards";
import MiniChart from "../components/MiniChart";
import Toast from "../components/Toast";
import { getApiErrorMessage } from "../utils/apiError";
import { buildFallbackShops, enrichShopCollection, DEFAULT_LOCATION } from "../utils/pressShops";

function AdminPanel() {
  const [shops, setShops] = useState([]);
  const [overview, setOverview] = useState(null);
  const [message, setMessage] = useState("");
  const [reviewingShopId, setReviewingShopId] = useState("");
  const [reviewNotes, setReviewNotes] = useState({});
  const [isLiveAdminData, setIsLiveAdminData] = useState(true);

  useEffect(() => {
    const loadAdmin = async () => {
      try {
        const [shopsRes, overviewRes] = await Promise.allSettled([
          API.get("/admin/shops"),
          API.get("/admin/overview")
        ]);

        if (shopsRes.status === "fulfilled") {
          setShops(Array.isArray(shopsRes.value.data) ? shopsRes.value.data : []);
          setIsLiveAdminData(true);
        } else {
          setShops([]);
          setIsLiveAdminData(false);
          setMessage(getApiErrorMessage(shopsRes.reason, "Admin shop queue load nahi ho paayi. Admin login ya backend restart check karo."));
        }

        if (overviewRes.status === "fulfilled") {
          setOverview(overviewRes.value.data);
        } else {
          setOverview({
            shops: shopsRes.status === "fulfilled" && Array.isArray(shopsRes.value.data) ? shopsRes.value.data.length : 0,
            pendingShops: 0,
            activeOrders: 0,
            revenue: 0
          });
          setMessage((current) => current || getApiErrorMessage(overviewRes.reason, "Admin overview load nahi hua. Shayad current account admin nahi hai."));
        }
      } catch (error) {
        setShops([]);
        setIsLiveAdminData(false);
        setOverview({
          shops: 0,
          pendingShops: 0,
          activeOrders: 0,
          revenue: 0
        });
        setMessage(getApiErrorMessage(error, "Admin data unavailable. Backend ya admin session check karo."));
      }
    };

    loadAdmin();
  }, []);

  const handleReview = async (shopId, verificationStatus) => {
    try {
      setReviewingShopId(shopId);
      const res = await API.patch(`/admin/shops/${shopId}/review`, {
        verificationStatus,
        verificationNotes: reviewNotes[shopId] || ""
      });
      setShops((current) => current.map((shop) => (shop._id === shopId ? res.data.shop : shop)));
      setMessage(res.data.message || "Shop updated.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Shop review update nahi ho paaya."));
    } finally {
      setReviewingShopId("");
    }
  };

  const topRated = [...shops].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);
  const serviceMix = shops.reduce((accumulator, shop) => {
    (shop.services || []).forEach((service) => {
      accumulator[service] = (accumulator[service] || 0) + 1;
    });
    return accumulator;
  }, {});
  const topServiceCount = Math.max(...Object.values(serviceMix), 1);
  const revenueTrend = [
    Math.max(overview?.revenue ? Math.round(overview.revenue * 0.22) : 120, 80),
    Math.max(overview?.revenue ? Math.round(overview.revenue * 0.4) : 180, 120),
    Math.max(overview?.revenue ? Math.round(overview.revenue * 0.58) : 220, 160),
    Math.max(overview?.revenue ? Math.round(overview.revenue * 0.71) : 260, 200),
    Math.max(overview?.revenue ? Math.round(overview.revenue * 0.88) : 310, 240),
    Math.max(overview?.revenue ? Math.round(overview.revenue) : 360, 280)
  ];
  const otpProviders = overview?.otpProviders;
  const pendingOfflineSubscriptions = shops.filter((shop) => shop.pendingSubscription?.paymentMode === "offline");
  const offlineHeavyWatchlist = overview?.offlineHeavyShops || [];

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Admin panel</p>
          <h1>Operations, discovery, and growth at a glance</h1>
          <p>Monitor shops, order flow, top categories, and marketplace quality from one place.</p>
        </div>
      </section>

      <Toast message={message} tone="warning" />
      {message && <p className="orders-page__state">{message}</p>}

      <section className="dashboard-grid dashboard-grid--stats">
        <article className="dashboard-card">
          <span className="dashboard-card__label">Registered shops</span>
          <strong>{overview?.shops ?? shops.length}</strong>
          <p>Active press partners visible across the service area.</p>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card__label">Active orders</span>
          <strong>{overview?.activeOrders ?? 0}</strong>
          <p>Orders currently in progress across pickup, press, and delivery.</p>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card__label">Pending shops</span>
          <strong>{overview?.pendingShops ?? shops.filter((shop) => shop.verificationStatus === "pending").length}</strong>
          <p>Listings waiting for verification before going live.</p>
        </article>
        <article className="dashboard-card">
          <span className="dashboard-card__label">Revenue</span>
          <strong>Rs. {overview?.revenue ?? 0}</strong>
          <p>Paid orders processed through the marketplace.</p>
          <MiniChart points={revenueTrend} />
        </article>
      </section>

      {otpProviders && (
        <section className="dashboard-grid">
          <article className="dashboard-card">
            <p className="dashboard-eyebrow">OTP delivery</p>
            <h2>Provider readiness</h2>
            <div className="offer-stack">
              <div className="offer-card">
                <strong>Email: {otpProviders.email.configured ? "ready" : "fallback"}</strong>
                <span>Provider: {otpProviders.email.provider}</span>
              </div>
              <div className="offer-card">
                <strong>SMS: {otpProviders.sms.configured ? "ready" : "fallback"}</strong>
                <span>Provider: {otpProviders.sms.provider}</span>
              </div>
            </div>
          </article>
        </section>
      )}

      <section className="dashboard-grid">
        {pendingOfflineSubscriptions.length > 0 && (
          <article className="dashboard-card dashboard-card--wide">
            <p className="dashboard-eyebrow">Subscriptions</p>
            <h2>Offline subscription approvals</h2>
            <div className="offer-stack">
              {pendingOfflineSubscriptions.map((shop) => (
                <div key={`subscription-${shop._id}`} className="offer-card">
                  <strong>{shop.shopName}</strong>
                  <span>
                    Pending plan: {shop.pendingSubscription?.planId} | Amount: Rs. {shop.pendingSubscription?.amount || 0}
                  </span>
                  <span>Owner: {shop.ownerUser?.name || "Shopkeeper"}</span>
                  <div className="auth-location-card__actions">
                    <button
                      type="button"
                      className="auth-form__secondary"
                      disabled={reviewingShopId === `subscription-${shop._id}`}
                      onClick={async () => {
                        try {
                          setReviewingShopId(`subscription-${shop._id}`);
                          const res = await API.patch(`/admin/shops/${shop._id}/subscription/approve`);
                          setShops((current) => current.map((item) => (item._id === shop._id ? res.data.shop : item)));
                          setMessage(res.data.message || "Subscription approved.");
                        } catch {
                          setMessage("Offline subscription approve nahi ho paya.");
                        } finally {
                          setReviewingShopId("");
                        }
                      }}
                    >
                      Approve offline payment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        )}

        <article className="dashboard-card dashboard-card--wide">
          <p className="dashboard-eyebrow">Verification queue</p>
          <h2>Approve or reject suspicious listings</h2>
          {!isLiveAdminData && (
            <p className="auth-card__message">
              Verification buttons tabhi kaam karenge jab live admin queue load ho. Abhi ya to admin auth fail hai ya backend restart pending hai.
            </p>
          )}
          <div className="offer-stack">
            {shops.map((shop) => (
              <div key={shop._id} className="offer-card">
                <strong>{shop.shopName}</strong>
                <span>{shop.address}</span>
                <span>Status: {shop.verificationStatus || "pending"} | Reports: {shop.reportCount || 0}</span>
                {shop.phoneVerifiedAt && <span>Phone verified: {new Date(shop.phoneVerifiedAt).toLocaleString()}</span>}
                {shop.fraudSignals?.length > 0 && <span>Flags: {shop.fraudSignals.join(", ")}</span>}
                {shop.ownerUser && <span>Owner: {shop.ownerUser.name} | {shop.ownerUser.phone || shop.ownerUser.email}</span>}
                {shop.verificationHistory?.length > 0 && (
                  <span>Last review: {shop.verificationHistory[shop.verificationHistory.length - 1].notes}</span>
                )}
                {shop.shopPhotoDataUrl && <img src={shop.shopPhotoDataUrl} alt={`${shop.shopName} shop`} style={{ width: "100%", maxHeight: "180px", objectFit: "cover", borderRadius: "16px" }} />}
                <input
                  className="auth-field__input"
                  placeholder="Admin note (required for reject/pending)"
                  value={reviewNotes[shop._id] || ""}
                  onChange={(event) => setReviewNotes((current) => ({ ...current, [shop._id]: event.target.value }))}
                />
                {isLiveAdminData && (
                  <div className="auth-location-card__actions">
                    <button type="button" className="auth-form__secondary" disabled={reviewingShopId === shop._id} onClick={() => handleReview(shop._id, "approved")}>
                      Approve
                    </button>
                    <button type="button" className="auth-form__secondary" disabled={reviewingShopId === shop._id} onClick={() => handleReview(shop._id, "rejected")}>
                      Reject
                    </button>
                    <button type="button" className="auth-form__secondary" disabled={reviewingShopId === shop._id} onClick={() => handleReview(shop._id, "pending")}>
                      Keep pending
                    </button>
                  </div>
                )}
              </div>
            ))}
            {shops.length === 0 && <p className="dashboard-empty">{isLiveAdminData ? "No shops awaiting review." : "Live admin queue unavailable."}</p>}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card dashboard-card--wide">
          <p className="dashboard-eyebrow">Marketplace leaders</p>
          <h2>Top rated shops</h2>
          <div className="favorite-list">
            {(overview?.topVendors?.length ? overview.topVendors : topRated).map((shop) => (
              <div key={shop._id} className="favorite-item">
                <strong>{shop.shopName}</strong>
                <span>
                  {"revenue" in shop ? `Orders: ${shop.orders} | Revenue: Rs. ${shop.revenue}` : shop.address}
                </span>
              </div>
            ))}
          </div>
        </article>
        <article className="dashboard-card">
          <p className="dashboard-eyebrow">Offline watchlist</p>
          <h2>Suspicious offline-heavy shops</h2>
          <div className="offer-stack">
            {offlineHeavyWatchlist.length > 0 ? offlineHeavyWatchlist.map((shop) => (
              <div key={shop._id} className="offer-card">
                <strong>{shop.shopName}</strong>
                <span>{shop.onlineConversionScore}% online | {shop.offlineOrders} offline orders</span>
                <span>Avoid taking payments outside platform. Review if this stays low.</span>
              </div>
            )) : Object.entries(serviceMix).slice(0, 3).map((item) => (
              <div key={item[0]} className="offer-card">
                <strong>{item[0]}</strong>
                <span>{item[1]} shops offer this service</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card dashboard-card--wide">
          <p className="dashboard-eyebrow">Service mix</p>
          <h2>Most visible categories</h2>
          <MiniChart variant="bars" bars={Object.values(serviceMix).slice(0, 6)} />
          <div className="metric-bars">
            {Object.entries(serviceMix).slice(0, 6).map(([service, count]) => (
              <div key={service} className="metric-bars__row">
                <div className="metric-bars__label">
                  <strong>{service}</strong>
                  <span>{count} shops</span>
                </div>
                <div className="metric-bars__track">
                  <span style={{ width: `${(count / topServiceCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="dashboard-card">
          <p className="dashboard-eyebrow">Live watchlist</p>
          <h2>Operational focus</h2>
          {overview ? (
            <div className="offer-stack">
              <div className="offer-card">
                <strong>{overview.activeOrders}</strong>
                <span>Orders moving across pickup, pressing, and dispatch.</span>
              </div>
              <div className="offer-card">
                <strong>{overview.topVendors?.length || 0}</strong>
                <span>Vendors currently leading the marketplace.</span>
              </div>
              <div className="offer-card">
                <strong>Rs. {overview.revenue}</strong>
                <span>Total marketplace revenue recorded so far.</span>
              </div>
            </div>
          ) : (
            <LoadingCards count={1} compact />
          )}
        </article>
      </section>
    </main>
  );
}

export default AdminPanel;
