import { useState } from "react";
import Map from "./Map";
import { getStatusLabel, getTimeline } from "../utils/orderMeta";

const shopkeeperStatuses = ["accepted", "picked_up", "pressed", "delivered", "completed"];

function OrderCard({ order, isShopkeeper, onUpdate }) {
  const [rescheduleForm, setRescheduleForm] = useState({
    reason: "",
    pickupDate: order.pickupDate || "",
    pickupTime: order.pickupTime || "",
    deliveryDate: order.deliveryDate || "",
    deliveryTime: order.deliveryTime || ""
  });
  const [paymentForm, setPaymentForm] = useState({
    gatewayOrderId: "",
    gatewayPaymentId: "",
    signature: ""
  });
  const [trackingForm, setTrackingForm] = useState({
    lat: "",
    lng: ""
  });
  const customer = order.user?.name || "Customer";
  const shopName = order.pressShop?.shopName || "Press shop";
  const availableNextStatus = shopkeeperStatuses[shopkeeperStatuses.indexOf(order.status) + 1];
  const timeline = getTimeline(order);
  const trackingLocation = order.liveTracking?.currentLocation;
  const canResolveReschedule = Boolean(order.rescheduleRequest?.status === "pending");
  const pseudoTrackingShop = trackingLocation?.lat && trackingLocation?.lng
    ? [{
        _id: `tracking-${order._id}`,
        shopName: "Delivery partner",
        address: "Live tracking point",
        location: {
          coordinates: [Number(trackingLocation.lng), Number(trackingLocation.lat)]
        }
      }]
    : [];

  return (
    <article className="order-card">
      <div className="order-card__header">
        <div>
          <p className="order-card__eyebrow">{shopName}</p>
          <h3>{isShopkeeper ? customer : `Order for ${order.clothesCount} clothes`}</h3>
        </div>
        <span className={`order-card__status order-card__status--${order.status}`}>{getStatusLabel(order.status)}</span>
      </div>

      <div className="order-card__meta">
        <p><strong>Pickup:</strong> {order.pickupAddress}</p>
        <p><strong>Payment:</strong> {order.paymentMode} / {order.paymentStatus}</p>
        {order.paymentMethod && <p><strong>Method:</strong> {order.paymentMethod}</p>}
        <p><strong>Total:</strong> Rs. {order.totalPrice}</p>
        <p><strong>Plan:</strong> {order.subscriptionPlanSnapshot || "basic"}</p>
        {typeof order.pricing?.platformFee === "number" && <p><strong>Platform fee:</strong> Rs. {order.pricing.platformFee}</p>}
        {typeof order.pricing?.shopEarning === "number" && <p><strong>Shop earning:</strong> Rs. {order.pricing.shopEarning}</p>}
        {order.clothType && <p><strong>Cloth type:</strong> {order.clothType}</p>}
        {order.serviceType && <p><strong>Service:</strong> {order.serviceType}</p>}
        {(order.pickupDate || order.pickupTime) && <p><strong>Pickup slot:</strong> {[order.pickupDate, order.pickupTime].filter(Boolean).join(" at ")}</p>}
        {(order.deliveryDate || order.deliveryTime) && <p><strong>Delivery slot:</strong> {[order.deliveryDate, order.deliveryTime].filter(Boolean).join(" at ")}</p>}
        {order.notes && <p><strong>Notes:</strong> {order.notes}</p>}
        {order.autoCancelAt && order.status === "accepted" && (
          <p><strong>Auto-cancel at:</strong> {new Date(order.autoCancelAt).toLocaleString()}</p>
        )}
        {order.autoCancelledReason && <p><strong>Auto-cancel reason:</strong> {order.autoCancelledReason}</p>}
        {order.rescheduleRequest?.status === "pending" && (
          <p><strong>Reschedule request:</strong> {order.rescheduleRequest.reason || "Pending review"}</p>
        )}
      </div>

      <div className="order-card__timeline">
        {timeline.map((item) => (
          <div
            key={item.key}
            className={`order-card__timeline-step${item.done ? " order-card__timeline-step--done" : ""}${item.current ? " order-card__timeline-step--current" : ""}`}
          >
            <span />
            <strong>{item.label}</strong>
          </div>
        ))}
      </div>

      {isShopkeeper ? (
        <div className="order-card__actions">
          {order.status === "pending" && (
            <>
              <button type="button" onClick={() => onUpdate(order._id, { status: "accepted" })}>
                Accept request
              </button>
              <button type="button" className="order-card__secondary" onClick={() => onUpdate(order._id, { status: "rejected" })}>
                Reject request
              </button>
            </>
          )}

          {order.status !== "pending" && order.status !== "completed" && order.status !== "cancelled" && availableNextStatus && (
            <button type="button" onClick={() => onUpdate(order._id, { status: availableNextStatus })}>
              Mark as {availableNextStatus.replace("_", " ")}
            </button>
          )}

          {order.paymentStatus !== "paid" && order.paymentMode !== "online" && (
            <button type="button" className="order-card__secondary" onClick={() => onUpdate(order._id, { paymentStatus: "paid" })}>
              Mark payment paid
            </button>
          )}
        </div>
      ) : (
        <div className="order-card__actions">
          {order.paymentMode === "online" && order.paymentStatus !== "paid" && (
            <button type="button" className="order-card__secondary" onClick={() => onUpdate(order._id, { verifyPayment: paymentForm })}>
              Verify online payment
            </button>
          )}
        </div>
      )}

      {order.paymentMode === "online" && order.paymentStatus !== "paid" && (
        <div className="order-card__meta">
          <p><strong>Secure payment verification</strong></p>
          <input
            placeholder="Gateway order id"
            value={paymentForm.gatewayOrderId}
            onChange={(event) => setPaymentForm((current) => ({ ...current, gatewayOrderId: event.target.value }))}
          />
          <input
            placeholder="Gateway payment id"
            value={paymentForm.gatewayPaymentId}
            onChange={(event) => setPaymentForm((current) => ({ ...current, gatewayPaymentId: event.target.value }))}
          />
          <input
            placeholder="Signature"
            value={paymentForm.signature}
            onChange={(event) => setPaymentForm((current) => ({ ...current, signature: event.target.value }))}
          />
        </div>
      )}

      <div className="order-card__meta">
        <p><strong>Reschedule system</strong></p>
        <input
          placeholder="Reason"
          value={rescheduleForm.reason}
          onChange={(event) => setRescheduleForm((current) => ({ ...current, reason: event.target.value }))}
        />
        <input
          type="date"
          value={rescheduleForm.pickupDate}
          onChange={(event) => setRescheduleForm((current) => ({ ...current, pickupDate: event.target.value }))}
        />
        <input
          type="time"
          value={rescheduleForm.pickupTime}
          onChange={(event) => setRescheduleForm((current) => ({ ...current, pickupTime: event.target.value }))}
        />
        <input
          type="date"
          value={rescheduleForm.deliveryDate}
          onChange={(event) => setRescheduleForm((current) => ({ ...current, deliveryDate: event.target.value }))}
        />
        <input
          type="time"
          value={rescheduleForm.deliveryTime}
          onChange={(event) => setRescheduleForm((current) => ({ ...current, deliveryTime: event.target.value }))}
        />
        <div className="order-card__actions">
          <button
            type="button"
            className="order-card__secondary"
            onClick={() => onUpdate(order._id, { requestReschedule: rescheduleForm })}
          >
            Request reschedule
          </button>
          {canResolveReschedule && (
            <>
              <button type="button" onClick={() => onUpdate(order._id, { resolveReschedule: "approved" })}>
                Approve reschedule
              </button>
              <button type="button" className="order-card__secondary" onClick={() => onUpdate(order._id, { resolveReschedule: "rejected" })}>
                Reject reschedule
              </button>
            </>
          )}
        </div>
      </div>

      {isShopkeeper && (order.status === "delivered" || order.status === "completed") && (
        <div className="order-card__meta">
          <p><strong>Live tracking update</strong></p>
          <input
            placeholder="Latitude"
            value={trackingForm.lat}
            onChange={(event) => setTrackingForm((current) => ({ ...current, lat: event.target.value }))}
          />
          <input
            placeholder="Longitude"
            value={trackingForm.lng}
            onChange={(event) => setTrackingForm((current) => ({ ...current, lng: event.target.value }))}
          />
          <div className="order-card__actions">
            <button type="button" onClick={() => onUpdate(order._id, { updateTracking: trackingForm })}>
              Update live tracking
            </button>
          </div>
        </div>
      )}

      {pseudoTrackingShop.length > 0 && (
        <div className="shop-details-map">
          <Map
            shops={pseudoTrackingShop}
            userLocation={[Number(trackingLocation.lat), Number(trackingLocation.lng)]}
            center={[Number(trackingLocation.lat), Number(trackingLocation.lng)]}
            zoom={15}
          />
        </div>
      )}
    </article>
  );
}

export default OrderCard;
