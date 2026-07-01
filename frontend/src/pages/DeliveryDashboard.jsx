import { useCallback, useEffect, useState } from "react";
import API from "../services/api";
import Toast from "../components/Toast";
import { getApiErrorMessage } from "../utils/apiError";

const pickupStatuses = new Set(["accepted", "picked_up"]);
const deliveryStatuses = new Set(["pressed", "delivered"]);

function mapsUrl(order, destination) {
  const address = destination === "shop" ? order.pressShop?.address : order.pickupAddress;
  const coordinates = destination === "shop" ? order.pressShop?.location?.coordinates : null;
  const target = Array.isArray(coordinates) && coordinates.length === 2
    ? `${coordinates[1]},${coordinates[0]}`
    : address;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target || "")}`;
}

function JobCard({ order, available, onClaim, onStatus, busyId }) {
  const isPickup = pickupStatuses.has(order.status);
  const destination = "customer";
  const nextStatus = order.status === "accepted"
    ? "picked_up"
    : order.status === "pressed"
    ? "delivered"
    : order.status === "delivered"
    ? "completed"
    : null;

  return (
    <article className="delivery-job">
      <div className="delivery-job__head">
        <div>
          <span className={`delivery-job__type delivery-job__type--${isPickup ? "pickup" : "delivery"}`}>
            {isPickup ? "Pickup" : "Delivery"}
          </span>
          <h3>{order.user?.name || "Customer"}</h3>
        </div>
        <strong>#{String(order._id).slice(-6).toUpperCase()}</strong>
      </div>
      <p className="delivery-job__address">{order.pickupAddress}</p>
      <div className="delivery-job__meta">
        <span>{order.clothesCount} clothes</span>
        <span>{order.pickupTime || order.deliveryTime || "Flexible time"}</span>
        <span>{order.pressShop?.shopName || "Press shop"}</span>
      </div>
      <div className="delivery-job__actions">
        <a className="delivery-button delivery-button--secondary" href={mapsUrl(order, destination)} target="_blank" rel="noreferrer">
          Open in Maps
        </a>
        {available ? (
          <button className="delivery-button" type="button" disabled={busyId === order._id} onClick={() => onClaim(order._id)}>
            {busyId === order._id ? "Accepting..." : "Accept job"}
          </button>
        ) : nextStatus ? (
          <button className="delivery-button" type="button" disabled={busyId === order._id} onClick={() => onStatus(order._id, nextStatus)}>
            {busyId === order._id ? "Updating..." : nextStatus === "picked_up" ? "Mark picked up" : nextStatus === "delivered" ? "Mark delivered" : "Complete order"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function DeliveryDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("today");

  const loadDashboard = useCallback(async () => {
    try {
      const response = await API.get("/delivery/dashboard");
      setData(response.data);
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Delivery dashboard could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const activeOrders = data?.activeOrders || [];
  const availableOrders = data?.availableOrders || [];
  const pickupOrders = activeOrders.filter((order) => pickupStatuses.has(order.status));
  const deliveryOrders = activeOrders.filter((order) => deliveryStatuses.has(order.status));
  const isAvailable = Boolean(data?.partner?.deliveryProfile?.isAvailable);

  const mutate = async (request, id = "profile") => {
    setBusyId(id);
    setMessage("");
    try {
      const response = await request();
      setMessage(response.data.message || "Updated successfully.");
      await loadDashboard();
    } catch (error) {
      setMessage(getApiErrorMessage(error, "The update could not be completed."));
    } finally {
      setBusyId("");
    }
  };

  const updateLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Location access is not supported by this browser.");
      return;
    }
    setBusyId("location");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => mutate(() => API.put("/delivery/location", { lat: coords.latitude, lng: coords.longitude }), "location"),
      () => {
        setBusyId("");
        setMessage("Location permission was denied or your location could not be detected.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  if (loading) {
    return <main className="delivery-page"><p className="delivery-empty">Loading delivery workspace...</p></main>;
  }

  return (
    <main className="delivery-page">
      <header className="delivery-hero">
        <div>
          <p className="dashboard-eyebrow">Delivery workspace</p>
          <h1>Good day, {data?.partner?.name || "Partner"}</h1>
          <p>Manage today’s pickups and deliveries from one focused queue.</p>
        </div>
        <label className="delivery-availability">
          <span>
            <strong>{isAvailable ? "Available" : "Offline"}</strong>
            <small>{isAvailable ? "New jobs are visible" : "Go online to accept jobs"}</small>
          </span>
          <input
            type="checkbox"
            checked={isAvailable}
            disabled={busyId === "profile"}
            onChange={() => mutate(() => API.put("/delivery/availability", { isAvailable: !isAvailable }))}
          />
          <i aria-hidden="true" />
        </label>
      </header>

      <Toast message={message} tone="info" />

      <section className="delivery-stats" aria-label="Delivery summary">
        <article><span>Active jobs</span><strong>{activeOrders.length}</strong></article>
        <article><span>Completed</span><strong>{data?.earnings?.completedJobs || 0}</strong></article>
        <article><span>Total earnings</span><strong>Rs. {data?.earnings?.total || 0}</strong></article>
        <article>
          <span>Current location</span>
          <button type="button" onClick={updateLocation} disabled={busyId === "location"}>
            {busyId === "location" ? "Updating..." : "Update location"}
          </button>
        </article>
      </section>

      <div className="delivery-tabs" role="tablist" aria-label="Delivery views">
        <button type="button" className={tab === "today" ? "is-active" : ""} onClick={() => setTab("today")}>Today</button>
        <button type="button" className={tab === "available" ? "is-active" : ""} onClick={() => setTab("available")}>Available jobs ({availableOrders.length})</button>
        <button type="button" className={tab === "completed" ? "is-active" : ""} onClick={() => setTab("completed")}>Completed</button>
      </div>

      {tab === "today" && (
        <div className="delivery-columns">
          <section>
            <div className="delivery-section-head"><div><p>Pickup queue</p><h2>Today’s pickups</h2></div><span>{pickupOrders.length}</span></div>
            <div className="delivery-job-list">
              {pickupOrders.map((order) => <JobCard key={order._id} order={order} onStatus={(id, status) => mutate(() => API.put(`/delivery/orders/${id}/status`, { status }), id)} busyId={busyId} />)}
              {!pickupOrders.length && <p className="delivery-empty">No pickups assigned right now.</p>}
            </div>
          </section>
          <section>
            <div className="delivery-section-head"><div><p>Return queue</p><h2>Today’s deliveries</h2></div><span>{deliveryOrders.length}</span></div>
            <div className="delivery-job-list">
              {deliveryOrders.map((order) => <JobCard key={order._id} order={order} onStatus={(id, status) => mutate(() => API.put(`/delivery/orders/${id}/status`, { status }), id)} busyId={busyId} />)}
              {!deliveryOrders.length && <p className="delivery-empty">No deliveries assigned right now.</p>}
            </div>
          </section>
        </div>
      )}

      {tab === "available" && (
        <section className="delivery-single-column">
          <div className="delivery-section-head"><div><p>Nearby work</p><h2>Available jobs</h2></div><span>{availableOrders.length}</span></div>
          {!isAvailable && <p className="delivery-empty">Switch to Available before accepting a job.</p>}
          <div className="delivery-job-grid">
            {availableOrders.map((order) => <JobCard key={order._id} order={order} available onClaim={(id) => mutate(() => API.post(`/delivery/orders/${id}/claim`), id)} busyId={busyId} />)}
            {!availableOrders.length && <p className="delivery-empty">No unassigned jobs are available.</p>}
          </div>
        </section>
      )}

      {tab === "completed" && (
        <section className="delivery-single-column">
          <div className="delivery-section-head"><div><p>Work history</p><h2>Completed orders</h2></div><span>{data?.completedOrders?.length || 0}</span></div>
          <div className="delivery-job-grid">
            {(data?.completedOrders || []).map((order) => <JobCard key={order._id} order={order} busyId={busyId} />)}
            {!data?.completedOrders?.length && <p className="delivery-empty">Completed orders will appear here.</p>}
          </div>
        </section>
      )}
    </main>
  );
}
