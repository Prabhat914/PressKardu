import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Map from "../components/Map";
import API from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import {
  DEFAULT_LOCATION,
  buildFallbackShops,
  enrichShopCollection,
  normalizeShop
} from "../utils/pressShops";
import { getFavoriteShopIds, toggleFavoriteShopId } from "../utils/session";

function ShopDetails() {
  const { id } = useParams();
  const [shop, setShop] = useState(null);
  const [message, setMessage] = useState("");
  const [favoriteIds, setFavoriteIds] = useState(getFavoriteShopIds());
  const [reportForm, setReportForm] = useState({
    reason: "",
    reporterName: "",
    reporterContact: ""
  });
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    const loadShop = async () => {
      try {
        const res = await API.get(`/press/${id}`);
        setShop(normalizeShop(res.data, 0, DEFAULT_LOCATION));
      } catch (error) {
        const fallback = enrichShopCollection(buildFallbackShops(DEFAULT_LOCATION), DEFAULT_LOCATION).find(
          (item) => item._id === id
        );

        if (fallback) {
          setShop(fallback);
          setMessage("Live details unavailable, showing curated partner profile.");
        } else {
          setMessage(getApiErrorMessage(error, "Shop details nahi mil paaye."));
        }
      }
    };

    loadShop();
  }, [id]);

  if (!shop) {
    return <main className="shop-details-page"><p className="orders-page__state">{message || "Loading shop..."}</p></main>;
  }

  const isFavorite = favoriteIds.includes(shop._id);
  const reviews = Array.isArray(shop.reviews) && shop.reviews.length > 0
    ? shop.reviews
    : [
        { authorName: "Aarav", rating: 5, comment: "Pickup was on time and shirts came back perfectly crisp." },
        { authorName: "Sneha", rating: 4, comment: "Good communication, neat fold, and clear pricing." },
        { authorName: "Ritika", rating: 5, comment: "Best option for wedding wear and urgent next-day finish." }
      ];

  const handleReportSubmit = async (event) => {
    event.preventDefault();
    setReporting(true);

    try {
      const res = await API.post(`/press/${shop._id}/report`, reportForm);
      setMessage(res.data.message || "Shop reported for review.");
      setReportForm({
        reason: "",
        reporterName: "",
        reporterContact: ""
      });
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Report submit nahi ho paaya."));
    } finally {
      setReporting(false);
    }
  };

  return (
    <main className="shop-details-page">
      <section className="shop-details-hero">
        <div className="shop-details-hero__copy">
          <p className="dashboard-eyebrow">Shop profile</p>
          <h1>{shop.shopName}</h1>
          <p>{shop.about || shop.specialty || "Trusted pressing service with doorstep convenience and clean turnaround."}</p>
          <div className="shop-details-hero__chips">
            <span>{typeof shop.rating === "number" ? `${shop.rating.toFixed(1)} rating` : "Top rated"}</span>
            <span>{shop.pickupWindow || "Pickup in 30 mins"}</span>
            <span>{shop.eta || "Same day service"}</span>
          </div>
          <div className="home-shops__actions">
            <Link className="home-shops__link" to="/">Book from home</Link>
            <button
              className="press-card__action press-card__action--secondary"
              type="button"
              onClick={() => setFavoriteIds(toggleFavoriteShopId(shop._id))}
            >
              {isFavorite ? "Remove favorite" : "Save favorite"}
            </button>
          </div>
        </div>

        <aside className="shop-details-sidecard">
          <strong>Pricing snapshot</strong>
          <p>Starting at Rs. {shop.pricePerCloth || 12} per cloth</p>
          <span>Minimum order: Rs. {shop.minimumOrderValue || 99}</span>
          <span>Turnaround: {shop.turnaroundHours || 24} hours</span>
          <span>Contact: {shop.phone || "Shared after booking"}</span>
        </aside>
      </section>

      {message && <p className="orders-page__state">{message}</p>}

      <section className="dashboard-grid">
        <article className="dashboard-card dashboard-card--wide">
          <p className="dashboard-eyebrow">Services</p>
          <h2>What this shop offers</h2>
          <div className="service-grid">
            {(shop.services || ["Steam press", "Dry clean", "Wash and iron", "Doorstep pickup"]).map((service) => (
              <span key={service} className="press-card__chip">{service}</span>
            ))}
          </div>
        </article>
        <article className="dashboard-card">
          <p className="dashboard-eyebrow">Service promise</p>
          <h2>Why people choose this shop</h2>
          <ul className="detail-list">
            <li>Transparent pricing and easy pickup scheduling.</li>
            <li>Order tracking from placed to delivered.</li>
            <li>Suitable for daily wear, premium fabrics, and event clothing.</li>
          </ul>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card dashboard-card--wide">
          <p className="dashboard-eyebrow">Map</p>
          <h2>Exact service location</h2>
          <div className="shop-details-map">
            <Map
              shops={[shop]}
              userLocation={DEFAULT_LOCATION}
              center={[shop.location.coordinates[1], shop.location.coordinates[0]]}
              zoom={15}
            />
          </div>
        </article>
        <article className="dashboard-card">
          <p className="dashboard-eyebrow">Customer reviews</p>
          <h2>Ratings and feedback</h2>
          <div className="review-list">
            {reviews.map((review, index) => (
              <article key={`${review.authorName}-${index}`} className="review-card">
                <strong>{review.authorName}</strong>
                <span>{"*".repeat(Math.round(review.rating || 5))}</span>
                <p>{review.comment}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card dashboard-card--wide">
          <p className="dashboard-eyebrow">Safety</p>
          <h2>Report fake or mismatched shop details</h2>
          <form className="auth-form" onSubmit={handleReportSubmit}>
            <label className="auth-field">
              <span className="auth-field__label">What looks wrong?</span>
              <input
                className="auth-field__input"
                value={reportForm.reason}
                onChange={(event) => setReportForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Example: shop does not exist at this address"
                required
                minLength={10}
              />
            </label>
            <div className="auth-form__split">
              <label className="auth-field">
                <span className="auth-field__label">Your name</span>
                <input
                  className="auth-field__input"
                  value={reportForm.reporterName}
                  onChange={(event) => setReportForm((current) => ({ ...current, reporterName: event.target.value }))}
                  placeholder="Optional"
                />
              </label>
              <label className="auth-field">
                <span className="auth-field__label">Contact</span>
                <input
                  className="auth-field__input"
                  value={reportForm.reporterContact}
                  onChange={(event) => setReportForm((current) => ({ ...current, reporterContact: event.target.value }))}
                  placeholder="Optional email or phone"
                />
              </label>
            </div>
            <button type="submit" disabled={reporting}>
              {reporting ? "Submitting..." : "Report this shop"}
            </button>
          </form>
        </article>
      </section>
    </main>
  );
}

export default ShopDetails;
