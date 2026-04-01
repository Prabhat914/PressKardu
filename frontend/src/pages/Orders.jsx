import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import OrderCard from "../components/OrderCard";
import Toast from "../components/Toast";
import LoadingCards from "../components/LoadingCards";
import API from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getStoredUser } from "../utils/session";

function Orders() {
  const currentUser = getStoredUser();
  const isShopkeeper = currentUser?.role === "presswala";
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const activeOrders = orders.filter((order) => !["completed", "cancelled", "rejected"].includes(order.status));
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);

      try {
        const endpoint = isShopkeeper ? "/orders/shop" : "/orders/my";
        const res = await API.get(endpoint);
        setOrders(res.data);
        setMessage("");
      } catch (error) {
        console.log(error);
        setMessage(getApiErrorMessage(error, "Orders abhi load nahi ho pa rahe."));
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [isShopkeeper]);

  const handleUpdate = async (orderId, payload) => {
    try {
      if (payload.verifyPayment) {
        await API.post(`/orders/${orderId}/verify-payment`, payload.verifyPayment);
      } else if (payload.requestReschedule) {
        await API.post(`/orders/${orderId}/reschedule`, payload.requestReschedule);
      } else if (payload.resolveReschedule) {
        await API.put(`/orders/${orderId}/reschedule`, { action: payload.resolveReschedule });
      } else if (payload.updateTracking) {
        await API.put(`/orders/${orderId}/tracking`, payload.updateTracking);
      } else {
        await API.put(`/orders/${orderId}/status`, payload);
      }

      const endpoint = isShopkeeper ? "/orders/shop" : "/orders/my";
      const res = await API.get(endpoint);
      setOrders(res.data);
      setMessage("");
    } catch (error) {
      console.log(error);
      setMessage(getApiErrorMessage(error, "Order update nahi ho paaya."));
    }
  };

  return (
    <main className="orders-page">
      <section className="orders-page__hero">
        <p className="orders-page__eyebrow">{isShopkeeper ? "Shopkeeper dashboard" : "Customer tracking"}</p>
        <h1>{isShopkeeper ? "Manage incoming press requests" : "Track your press requests"}</h1>
        <p>
          {isShopkeeper
            ? "Accept or reject requests, update pickup and delivery progress, share live tracking, and handle reschedules."
            : "See every request, verify payments securely, and follow it from pickup to delivery."}
        </p>
        <div className="orders-page__actions">
          <Link className="home-shops__link" to={isShopkeeper ? "/shops" : "/"}>{isShopkeeper ? "Open shop view" : "Find shops"}</Link>
        </div>
        <div className="orders-page__summary">
          <article><strong>{activeOrders.length}</strong><span>In progress</span></article>
          <article><strong>{paidOrders.length}</strong><span>Paid orders</span></article>
          <article><strong>{orders.length}</strong><span>Total tracked</span></article>
        </div>
      </section>

      {loading && <LoadingCards count={3} />}
      <Toast message={!loading ? message : ""} tone="warning" />
      {!loading && message && <p className="orders-page__state">{message}</p>}
      {!loading && !message && orders.length === 0 && (
        <p className="orders-page__state">No orders found yet.</p>
      )}

      <section className="orders-page__list">
        {orders.map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            isShopkeeper={isShopkeeper}
            onUpdate={handleUpdate}
          />
        ))}
      </section>
    </main>
  );
}

export default Orders;
