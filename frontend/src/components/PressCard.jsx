import { useState } from "react";
import { getFavoriteShopIds, toggleFavoriteShopId } from "../utils/session";

function PressCard({
  shop,
  index,
  actionLabel,
  onAction,
  actionDisabled,
  secondaryActionLabel,
  onSecondaryAction,
  tertiaryActionLabel,
  onTertiaryAction,
  children,
  className = "",
  style
}) {
  const [isFavorite, setIsFavorite] = useState(getFavoriteShopIds().includes(shop._id));
  const startingPrice =
    typeof shop.pricePerCloth === "number" ? `Rs. ${shop.pricePerCloth}` : "Price on request";

  const address = shop.address || shop.locationName || "Address shared after booking";
  const phone = shop.phone || shop.mobile || "Contact available at shop";
  const eta = shop.eta || "Same day service";
  const rating = typeof shop.rating === "number" ? shop.rating.toFixed(1) : "New";
  const specialty = shop.specialty || "Steam press";
  const pickupWindow = shop.pickupWindow || "Pickup within 45 mins";
  const distance = typeof shop.distanceKm === "number" ? `${shop.distanceKm.toFixed(1)} km away` : "Nearby";
  const services = Array.isArray(shop.services) && shop.services.length > 0 ? shop.services.slice(0, 3) : [];
  const reviewCount = Array.isArray(shop.reviews) ? shop.reviews.length : 0;
  const bannerTone = shop.isFeatured ? "press-card__banner--featured" : "press-card__banner--standard";

  return (
    <article className={`press-card ${className}`.trim()} style={style}>
      <div className="press-card__glow" aria-hidden="true" />
      <div className={`press-card__banner ${bannerTone}`}>
        <span>{shop.isFeatured ? "Featured partner" : "Local pickup ready"}</span>
        <button
          className={`press-card__favorite${isFavorite ? " press-card__favorite--active" : ""}`}
          type="button"
          onClick={() => {
            const next = toggleFavoriteShopId(shop._id);
            setIsFavorite(next.includes(shop._id));
          }}
        >
          {isFavorite ? "Saved" : "Save"}
        </button>
      </div>
      <div className="press-card__header">
        <span className="press-card__badge">Shop {index + 1}</span>
        <span className="press-card__price">{startingPrice}</span>
      </div>

      <div className="press-card__identity">
        <div>
          <h3 className="press-card__title">{shop.shopName || "Press Shop"}</h3>
          <p className="press-card__meta">{address}</p>
        </div>
        <div className="press-card__rating-box">
          <strong>{rating === "New" ? "New" : rating}</strong>
          <span>{rating === "New" ? "Just joined" : "Trusted score"}</span>
        </div>
      </div>

      <div className="press-card__highlights">
        <span>{distance}</span>
        <span>{rating === "New" ? "Fresh on PressKardu" : `${rating} rating`}</span>
        <span>{shop.pricePerCloth ? "Transparent pricing" : "Quick quote"}</span>
        <span>{reviewCount > 0 ? `${reviewCount} reviews` : "New reviews coming in"}</span>
      </div>

      <div className="press-card__details">
        <div>
          <span className="press-card__label">Service</span>
          <p>{specialty}</p>
        </div>
        <div>
          <span className="press-card__label">Turnaround</span>
          <p>{eta}</p>
        </div>
        <div>
          <span className="press-card__label">Pickup</span>
          <p>{pickupWindow}</p>
        </div>
        <div>
          <span className="press-card__label">Contact</span>
          <p>{phone}</p>
        </div>
      </div>

      {services.length > 0 && (
        <div className="press-card__chips">
          {services.map((service) => (
            <span key={service} className="press-card__chip">
              {service}
            </span>
          ))}
        </div>
      )}

      {(actionLabel || secondaryActionLabel || tertiaryActionLabel) && (
        <div className="press-card__actions">
          {actionLabel && (
            <button className="press-card__action" type="button" onClick={() => onAction?.(shop)} disabled={actionDisabled}>
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && (
            <button className="press-card__action press-card__action--secondary" type="button" onClick={() => onSecondaryAction?.(shop)}>
              {secondaryActionLabel}
            </button>
          )}
          {tertiaryActionLabel && (
            <button className="press-card__action press-card__action--secondary" type="button" onClick={() => onTertiaryAction?.(shop)}>
              {tertiaryActionLabel}
            </button>
          )}
        </div>
      )}

      {children}
    </article>
  );
}

export default PressCard;
