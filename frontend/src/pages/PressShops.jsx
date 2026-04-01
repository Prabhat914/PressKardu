import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PressCard from "../components/PressCard";
import Map from "../components/Map";
import LazyPressScene from "../components/LazyPressScene";
import LoadingCards from "../components/LoadingCards";
import Toast from "../components/Toast";
import API from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { buildFallbackShops, DEFAULT_LOCATION, enrichShopCollection } from "../utils/pressShops";

function PressShops() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [allShops, setAllShops] = useState([]);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: "",
    service: "all",
    sortBy: "rating",
    maxPrice: "all"
  });

  useEffect(() => {
    const fallbackToShops = (nextLocation, message) => {
      setLocation(nextLocation);
      const enriched = enrichShopCollection(buildFallbackShops(nextLocation), nextLocation);
      setAllShops(enriched);
      setShops(enriched);
      setStatus(message);
      setLoading(false);
    };

    if (!navigator.geolocation) {
      fallbackToShops(DEFAULT_LOCATION, "Showing curated press shops because location access is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLocation([lat, lng]);

        try {
          const res = await API.get(`/press/nearby?lat=${lat}&lng=${lng}`);
          const incomingShops = Array.isArray(res.data) ? res.data : [];

          if (incomingShops.length === 0) {
            const enriched = enrichShopCollection(buildFallbackShops([lat, lng]), [lat, lng]);
            setAllShops(enriched);
            setShops(enriched);
            setStatus("No live shops were returned nearby, so curated PressKardu partners are being shown instead.");
          } else {
            const enriched = enrichShopCollection(incomingShops, [lat, lng]);
            setAllShops(enriched);
            setShops(enriched);
            setStatus("Live nearby press shops loaded for your area.");
          }
        } catch (requestError) {
          console.log(requestError);
          const enriched = enrichShopCollection(buildFallbackShops([lat, lng]), [lat, lng]);
          setAllShops(enriched);
          setShops(enriched);
          setStatus(
            `${getApiErrorMessage(
              requestError,
              "Nearby API is unavailable right now."
            )} Curated press shops are being shown.`
          );
        } finally {
          setLoading(false);
        }
      },
      () => {
        fallbackToShops(DEFAULT_LOCATION, "Location permission was denied, so curated press shops are shown around the default service zone.");
      }
    );
  }, []);

  useEffect(() => {
    let next = [...allShops];

    if (filters.q) {
      next = next.filter((shop) =>
        `${shop.shopName} ${shop.address} ${shop.specialty}`.toLowerCase().includes(filters.q.toLowerCase())
      );
    }

    if (filters.service !== "all") {
      next = next.filter((shop) => Array.isArray(shop.services) && shop.services.includes(filters.service));
    }

    if (filters.maxPrice !== "all") {
      next = next.filter((shop) => Number(shop.pricePerCloth || 0) <= Number(filters.maxPrice));
    }

    if (filters.sortBy === "price") {
      next.sort((a, b) => Number(a.pricePerCloth || 0) - Number(b.pricePerCloth || 0));
    } else if (filters.sortBy === "fastest") {
      next.sort((a, b) => Number(a.turnaroundHours || 24) - Number(b.turnaroundHours || 24));
    } else {
      next.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    }

    setShops(next);
  }, [allShops, filters]);

  const availableServices = Array.from(
    new Set(allShops.flatMap((shop) => (Array.isArray(shop.services) ? shop.services : [])))
  ).slice(0, 8);

  return (
    <section className="press-shops-page">
      <div className="press-shops-page__map">
        <div className="press-shops-page__hero-card">
          <div className="press-shops-page__hero-copy">
            <p className="press-shops-page__eyebrow">Live map plus visual preview</p>
            <h1>Find a sharper finish, faster</h1>
            <p>
              Browse PressKardu shops with a live map, curated backup partners, and a 3D press preview that gives this page more energy.
            </p>
          </div>
          <LazyPressScene />
        </div>
        <Map shops={shops} userLocation={location} />
      </div>

        <aside className="press-shops-page__panel">
        <div className="press-shops-page__intro">
          <p className="press-shops-page__eyebrow">Nearby laundry partners</p>
          <h2>Press shops around you</h2>
          <p>
            Compare pricing, delivery speed, and contact details before placing
            your order.
          </p>
        </div>

        <div className="shop-filters">
          <input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="Search by shop, area, or specialty"
          />
          <div className="shop-filters__row">
            <select value={filters.service} onChange={(event) => setFilters((current) => ({ ...current, service: event.target.value }))}>
              <option value="all">All services</option>
              {availableServices.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
            <select value={filters.sortBy} onChange={(event) => setFilters((current) => ({ ...current, sortBy: event.target.value }))}>
              <option value="rating">Top rated</option>
              <option value="price">Lowest price</option>
              <option value="fastest">Fastest</option>
            </select>
            <select value={filters.maxPrice} onChange={(event) => setFilters((current) => ({ ...current, maxPrice: event.target.value }))}>
              <option value="all">Any price</option>
              <option value="10">Up to Rs. 10</option>
              <option value="15">Up to Rs. 15</option>
              <option value="20">Up to Rs. 20</option>
            </select>
          </div>
        </div>

        {loading && <LoadingCards count={4} compact />}
        <Toast message={!loading ? status : ""} tone="info" />
        {!loading && status && <p className="press-shops-page__state">{status}</p>}
        {!loading && shops.length === 0 && (
          <p className="press-shops-page__state">No press shops found near your location yet.</p>
        )}

        <div className="press-shops-page__list">
          {shops.map((shop, index) => (
            <PressCard
              key={shop._id || `${shop.shopName}-${index}`}
              shop={shop}
              index={index}
              actionLabel="View details"
              onAction={() => navigate(`/shops/${shop._id}`)}
            />
          ))}
        </div>
      </aside>
    </section>
  );
}

export default PressShops;
