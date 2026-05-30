import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { clearCart, getCartItems, removeCartItem, saveCartItems } from "../utils/cart";
import { getStoredUser } from "../utils/session";
import { startHostedPayment } from "../utils/payment";
import Toast from "../components/Toast";

function shopSupportsOnlinePayments(shop) {
  return ["pro", "premium"].includes(String(shop?.subscriptionPlan || "").toLowerCase()) && shop?.subscriptionStatus === "active";
}

function estimateTotal(item, form) {
  const subtotal = Number(form.clothesCount || 0) * Number(item?.shop?.pricePerCloth || 0);
  const codFee = form.paymentMode === "offline" ? 10 : 0;
  return {
    subtotal,
    codFee,
    total: Math.max(0, subtotal + codFee)
  };
}

function Checkout() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [cartItems, setCartItems] = useState(() => getCartItems());
  const [selectedShopId, setSelectedShopId] = useState(() => getCartItems()[0]?.shop?._id || "");
  const selectedItem = cartItems.find((item) => item.shop._id === selectedShopId) || cartItems[0] || null;
  const [form, setForm] = useState({
    clothesCount: selectedItem?.clothesCount || 5,
    pickupAddress: "",
    notes: "",
    paymentMode: "offline",
    paymentMethod: "cash",
    clothType: selectedItem?.clothType || "Daily wear",
    serviceType: selectedItem?.serviceType || "Steam press",
    pickupDate: "",
    pickupTime: "",
    deliveryDate: "",
    deliveryTime: "",
    couponCode: ""
  });
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
  const [submitting, setSubmitting] = useState(false);
  const estimate = selectedItem ? estimateTotal(selectedItem, form) : null;

  useEffect(() => {
    if (!selectedItem && cartItems.length > 0) {
      setSelectedShopId(cartItems[0].shop._id);
    }
  }, [cartItems, selectedItem]);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    setForm((current) => ({
      ...current,
      clothesCount: selectedItem.clothesCount,
      clothType: selectedItem.clothType,
      serviceType: selectedItem.serviceType,
      paymentMode: shopSupportsOnlinePayments(selectedItem.shop) ? current.paymentMode : "offline"
    }));
  }, [selectedItem]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleQuantityChange = (event) => {
    const value = event.target.value;
    handleFormChange(event);

    const next = cartItems.map((item) =>
      item.shop._id === selectedItem?.shop?._id
        ? { ...item, clothesCount: Number(value || 1) }
        : item
    );
    setCartItems(next);
    saveCartItems(next);
  };

  const handleRemove = (shopId) => {
    const next = removeCartItem(shopId);
    setCartItems(next);
    setSelectedShopId(next[0]?.shop?._id || "");
    setMessage("Cart item removed.");
    setMessageTone("info");
  };

  const handleCheckout = async (event) => {
    event.preventDefault();

    if (!selectedItem) {
      return;
    }

    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (!form.pickupAddress.trim()) {
      setMessage("Pickup address is required.");
      setMessageTone("warning");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setMessageTone("info");

    try {
      const res = await API.post("/orders", {
        pressShop: selectedItem.shop._id,
        clothesCount: Number(form.clothesCount),
        pickupAddress: form.pickupAddress,
        notes: form.notes,
        paymentMode: form.paymentMode,
        paymentMethod: form.paymentMethod,
        clothType: form.clothType,
        serviceType: form.serviceType,
        pickupDate: form.pickupDate,
        pickupTime: form.pickupTime,
        deliveryDate: form.deliveryDate,
        deliveryTime: form.deliveryTime,
        couponCode: form.couponCode
      });

      if (form.paymentMode === "online" && res.data.paymentSession) {
        await startHostedPayment({
          session: res.data.paymentSession,
          customer: currentUser,
          onSuccess: async (paymentResult) => {
            await API.post(`/orders/${res.data._id}/verify-payment`, {
              gatewayOrderId: paymentResult.razorpay_order_id,
              gatewayPaymentId: paymentResult.razorpay_payment_id,
              signature: paymentResult.razorpay_signature
            });
          }
        });
      }

      const next = removeCartItem(selectedItem.shop._id);
      setCartItems(next);
      if (next.length === 0) {
        clearCart();
      }
      setMessage("Order placed successfully.");
      setMessageTone("success");
      window.setTimeout(() => navigate("/orders"), 900);
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Checkout complete nahi ho paaya."));
      setMessageTone("warning");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="checkout-page">
      <Toast message={message} tone={messageTone} />
      <section className="dashboard-hero checkout-hero">
        <div>
          <p className="dashboard-eyebrow">Cart and checkout</p>
          <h1>Review your ironing pickup before placing the order</h1>
          <p>Compare saved shop picks, confirm quantity, choose payment mode, and send the final booking request.</p>
        </div>
        <Link className="home-shops__link" to="/shops">Add more shops</Link>
      </section>

      {cartItems.length === 0 ? (
        <section className="dashboard-card checkout-empty">
          <p className="dashboard-eyebrow">Cart empty</p>
          <h2>No checkout items yet</h2>
          <p>Choose a live shop from the listing and add it to checkout.</p>
          <Link className="home-shops__link" to="/shops">Browse shops</Link>
        </section>
      ) : (
        <section className="checkout-layout">
          <aside className="checkout-cart">
            <div className="dashboard-card__head">
              <div>
                <p className="dashboard-eyebrow">Saved picks</p>
                <h2>Your cart</h2>
              </div>
            </div>
            {cartItems.map((item) => (
              <button
                key={item.shop._id}
                className={`checkout-cart__item${item.shop._id === selectedItem?.shop?._id ? " checkout-cart__item--active" : ""}`}
                type="button"
                onClick={() => setSelectedShopId(item.shop._id)}
              >
                <span>
                  <strong>{item.shop.shopName}</strong>
                  <small>{item.shop.address || "Pickup address added at checkout"}</small>
                </span>
                <em>Rs. {Number(item.shop.pricePerCloth || 0)} x {item.clothesCount}</em>
              </button>
            ))}
          </aside>

          <form className="checkout-form" onSubmit={handleCheckout}>
            <div className="auth-location-card">
              <div className="auth-location-card__head">
                <strong>{selectedItem.shop.shopName}</strong>
                <span>{selectedItem.shop.address || "Shop address available after confirmation."}</span>
              </div>
              {estimate && (
                <div className="press-card__highlights">
                  <span>Subtotal Rs. {estimate.subtotal}</span>
                  <span>COD fee Rs. {estimate.codFee}</span>
                  <span>Total Rs. {estimate.total}</span>
                </div>
              )}
            </div>

            <div className="order-request__split">
              <label>
                <span>Clothes count</span>
                <input name="clothesCount" type="number" min="1" value={form.clothesCount} onChange={handleQuantityChange} />
              </label>
              <label>
                <span>Payment mode</span>
                <select name="paymentMode" value={form.paymentMode} onChange={handleFormChange}>
                  <option value="offline">Offline</option>
                  <option value="online" disabled={!shopSupportsOnlinePayments(selectedItem.shop)}>Online</option>
                </select>
              </label>
            </div>

            <div className="order-request__split">
              <label>
                <span>Cloth type</span>
                <select name="clothType" value={form.clothType} onChange={handleFormChange}>
                  <option value="Daily wear">Daily wear</option>
                  <option value="Office wear">Office wear</option>
                  <option value="Premium fabric">Premium fabric</option>
                  <option value="Wedding wear">Wedding wear</option>
                </select>
              </label>
              <label>
                <span>Service type</span>
                <select name="serviceType" value={form.serviceType} onChange={handleFormChange}>
                  <option value="Steam press">Steam press</option>
                  <option value="Wash and iron">Wash and iron</option>
                  <option value="Dry clean">Dry clean</option>
                  <option value="Express press">Express press</option>
                </select>
              </label>
            </div>

            <label>
              <span>Pickup address</span>
              <input name="pickupAddress" value={form.pickupAddress} onChange={handleFormChange} placeholder="Where should the shopkeeper collect the clothes?" required />
            </label>

            <div className="order-request__split">
              <label>
                <span>Pickup date</span>
                <input name="pickupDate" type="date" value={form.pickupDate} onChange={handleFormChange} />
              </label>
              <label>
                <span>Pickup time</span>
                <input name="pickupTime" type="time" value={form.pickupTime} onChange={handleFormChange} />
              </label>
            </div>

            <div className="order-request__split">
              <label>
                <span>Delivery date</span>
                <input name="deliveryDate" type="date" value={form.deliveryDate} onChange={handleFormChange} />
              </label>
              <label>
                <span>Delivery time</span>
                <input name="deliveryTime" type="time" value={form.deliveryTime} onChange={handleFormChange} />
              </label>
            </div>

            <div className="order-request__split">
              <label>
                <span>Payment method</span>
                <select name="paymentMethod" value={form.paymentMethod} onChange={handleFormChange}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </label>
              <label>
                <span>Coupon code</span>
                <input name="couponCode" value={form.couponCode} onChange={handleFormChange} placeholder={form.paymentMode === "online" ? "WELCOME20" : "Coupons are online only"} />
              </label>
            </div>

            <label>
              <span>Notes</span>
              <input name="notes" value={form.notes} onChange={handleFormChange} placeholder="Special instructions for ironing or delivery" />
            </label>

            <div className="order-request__actions">
              <button type="submit" disabled={submitting}>
                {submitting ? "Placing order..." : "Place order"}
              </button>
              <button type="button" className="order-request__cancel" onClick={() => handleRemove(selectedItem.shop._id)}>
                Remove
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}

export default Checkout;
