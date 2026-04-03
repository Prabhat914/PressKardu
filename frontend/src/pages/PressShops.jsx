import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [shops, setShops] = useState([]);
  const [allShops, setAllShops] = useState([]);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [mapCenter, setMapCenter] = useState(DEFAULT_LOCATION);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    service: "all",
    sortBy: "rating",
    maxPrice: "all"
  });
  const externalQuery = searchParams.get("q")?.trim() || "";

  const applyShopCollection = (incoming, nextLocation, nextStatus) => {
    const enriched = enrichShopCollection(incoming, nextLocation);
    setAllShops(enriched);
    setShops(enriched);
    setStatus(nextStatus);

    const firstShopWithCoordinates = enriched.find(
      (shop) => Array.isArray(shop.location?.coordinates) && shop.location.coordinates.length >= 2
    );

    if (firstShopWithCoordinates) {
      setMapCenter([
        firstShopWithCoordinates.location.coordinates[1],
        firstShopWithCoordinates.location.coordinates[0]
      ]);
      return;
    }

    setMapCenter(nextLocation);
  };

  const fallbackToShops = (nextLocation, message) => {
    setLocation(nextLocation);
    applyShopCollection(buildFallbackShops(nextLocation), nextLocation, message);
    setLoading(false);
    setLocationReady(true);
  };

  const loadNearbyShops = async (nextLocation) => {
    setLoading(true);

    try {
      const [lat, lng] = nextLocation;
      const res = await API.get(`/press/nearby?lat=${lat}&lng=${lng}`);
      const incomingShops = Array.isArray(res.data) ? res.data : [];

      if (incomingShops.length === 0) {
        applyShopCollection(
          buildFallbackShops(nextLocation),
          nextLocation,
          "No live shops were returned nearby, so curated PressKardu partners are being shown instead."
        );
      } else {
        applyShopCollection(incomingShops, nextLocation, "Live nearby press shops loaded for your area.");
      }
    } catch (requestError) {
      console.log(requestError);
      applyShopCollection(
        buildFallbackShops(nextLocation),
        nextLocation,
        `${getApiErrorMessage(
          requestError,
          "Nearby API is unavailable right now."
        )} Curated press shops are being shown.`
      );
    } finally {
      setLoading(false);
      setLocationReady(true);
    }
  };

  const searchShops = async (query) => {
    setSearching(true);
    setLoading(true);

    try {
      const res = await API.get(`/press?q=${encodeURIComponent(query)}`);
      const incomingShops = Array.isArray(res.data) ? res.data : [];

      if (incomingShops.length === 0) {
        setAllShops([]);
        setShops([]);
        setStatus(`"${query}" ke liye koi live shop nahi mila. Dusra city ya area try karo.`);
        setMapCenter(location);
      } else {
        applyShopCollection(incomingShops, location, `Showing live shop results for "${query}".`);
      }
    } catch (requestError) {
      console.log(requestError);
      setStatus(getApiErrorMessage(requestError, "Search complete nahi ho paayi. Thoda baad try karo."));
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  useEffect(() => {

    if (!navigator.geolocation) {
      fallbackToShops(DEFAULT_LOCATION, "Showing curated press shops because location access is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const nextLocation = [lat, lng];
        setLocation(nextLocation);

        if (externalQuery) {
          setLocationReady(true);
          return;
        }

        loadNearbyShops(nextLocation);
      },
      () => {
        fallbackToShops(DEFAULT_LOCATION, "Location permission was denied, so curated press shops are shown around the default service zone.");
      }
    );
  }, []);

  useEffect(() => {
    if (!locationReady || !externalQuery) {
      return;
    }

    setFilters((current) => ({
      ...current,
      q: externalQuery
    }));

    searchShops(externalQuery);
  }, [externalQuery, locationReady]);

  const handleSearchSubmit = async (event) => {
    event.preventDefault();

    const query = filters.q.trim();
    if (!query) {
      setSearchParams({});
      await loadNearbyShops(location);
      return;
    }

    setSearchParams({ q: query });
  };

  const handleResetToNearby = async () => {
    setFilters((current) => ({
      ...current,
      q: ""
    }));
    setSearchParams({});
    await loadNearbyShops(location);
  };

  useEffect(() => {
    let next = [...allShops];

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
            <p className="press-shops-page__eyebrow">Live map plus city-wide compare</p>
            <h1>Compare shops from your area or another city</h1>
            <p>
              Browse nearby partners, or search any city, area, or shop name when you want to compare options beyond your current location.
            </p>
          </div>
          <LazyPressScene />
        </div>
        <Map shops={shops} userLocation={location} center={mapCenter} />
      </div>

        <aside className="press-shops-page__panel">
        <div className="press-shops-page__intro">
          <p className="press-shops-page__eyebrow">Search nearby or across cities</p>
          <h2>Press shops you can compare</h2>
          <p>
            Search by city, area, or shop name, then compare pricing, delivery speed, and contact details before placing your order.
          </p>
        </div>

        <form className="shop-filters" onSubmit={handleSearchSubmit}>
          <input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="Search city, area, or shop name"
          />
          <div className="shop-filters__actions">
            <button className="shop-filters__button" type="submit" disabled={searching}>
              {searching ? "Searching..." : "Search shops"}
            </button>
            <button className="shop-filters__button shop-filters__button--secondary" type="button" onClick={handleResetToNearby}>
              Use my area
            </button>
          </div>
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
        </form>

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
