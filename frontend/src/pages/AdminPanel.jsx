import { useEffect, useState } from "react";
import API from "../services/api";
import LoadingCards from "../components/LoadingCards";
import MiniChart from "../components/MiniChart";
import Toast from "../components/Toast";
import { buildFallbackShops, enrichShopCollection, DEFAULT_LOCATION } from "../utils/pressShops";

function AdminPanel() {
  const [shops, setShops] = useState([]);
  const [overview, setOverview] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadAdmin = async () => {
      try {
        const [shopsRes, overviewRes] = await Promise.allSettled([
          API.get("/press"),
          API.get("/admin/overview")
        ]);

        if (shopsRes.status === "fulfilled") {
          setShops(Array.isArray(shopsRes.value.data) ? shopsRes.value.data : []);
        } else {
          setShops(enrichShopCollection(buildFallbackShops(DEFAULT_LOCATION), DEFAULT_LOCATION));
          setMessage("Live admin metrics unavailable, showing simulated overview.");
        }

        if (overviewRes.status === "fulfilled") {
          setOverview(overviewRes.value.data);
        } else {
          setOverview(null);
          setMessage("Admin overview requires an admin account. Showing marketplace-only fallback.");
        }
      } catch {
        setShops(enrichShopCollection(buildFallbackShops(DEFAULT_LOCATION), DEFAULT_LOCATION));
        setMessage("Admin data unavailable, fallback overview loaded.");
      }
    };

    loadAdmin();
  }, []);

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
          <span className="dashboard-card__label">Revenue</span>
          <strong>Rs. {overview?.revenue ?? 0}</strong>
          <p>Paid orders processed through the marketplace.</p>
          <MiniChart points={revenueTrend} />
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
          <p className="dashboard-eyebrow">At-risk pickups</p>
          <h2>Orders needing attention</h2>
          <div className="offer-stack">
            {(overview?.overduePickupOrders?.length ? overview.overduePickupOrders : Object.entries(serviceMix).slice(0, 5)).map((item) => (
              "pickupAddress" in item ? (
                <div key={item._id} className="offer-card">
                  <strong>{item.pressShop?.shopName || "Press shop"}</strong>
                  <span>{item.pickupAddress}</span>
                </div>
              ) : (
                <div key={item[0]} className="offer-card">
                  <strong>{item[0]}</strong>
                  <span>{item[1]} shops offer this service</span>
                </div>
              )
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
