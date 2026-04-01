import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Map from "../components/Map";
import PressCard from "../components/PressCard";
import LazyPressScene from "../components/LazyPressScene";
import OpeningIntro from "../components/OpeningIntro";
import Toast from "../components/Toast";
import LoadingCards from "../components/LoadingCards";
import API from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { buildFallbackShops, DEFAULT_LOCATION, enrichShopCollection, isBookableShop } from "../utils/pressShops";
import { getStoredUser } from "../utils/session";
import { startHostedPayment } from "../utils/payment";

function Home() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [shopScope, setShopScope] = useState("all");
  const [selectedShop, setSelectedShop] = useState(null);
  const [openMapShopId, setOpenMapShopId] = useState(null);
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [orderForm, setOrderForm] = useState({
    clothesCount: "5",
    pickupAddress: "",
    notes: "",
    paymentMode: "offline",
    paymentMethod: "cash",
    clothType: "Daily wear",
    serviceType: "Steam press",
    pickupDate: "",
    pickupTime: "",
    deliveryDate: "",
    deliveryTime: "",
    couponCode: ""
  });
  const [orderMessage, setOrderMessage] = useState("");
  const [orderMessageTone, setOrderMessageTone] = useState("neutral");
  const [paymentStage, setPaymentStage] = useState("idle");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [shopSearch, setShopSearch] = useState("");
  const requestFormRef = useRef(null);

  const currentUser = getStoredUser();
  const isUser = currentUser?.role !== "presswala";
  const averagePrice =
    shops.length > 0
      ? Math.round(
          shops.reduce((total, shop) => total + (typeof shop.pricePerCloth === "number" ? shop.pricePerCloth : 0), 0) /
            shops.length
        )
      : 0;
  const fastestEta = shops[0]?.pickupWindow || "Pickup in 25 mins";
  const featuredShop = shops[featuredIndex % Math.max(shops.length, 1)];
  const filteredShops = shops.filter((shop) =>
    `${shop.shopName || ""} ${shop.address || ""} ${shop.specialty || ""}`
      .toLowerCase()
      .includes(shopSearch.trim().toLowerCase())
  );

  useEffect(() => {
    if (shops.length < 2) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % shops.length);
    }, 3600);

    return () => window.clearInterval(intervalId);
  }, [shops]);

  useEffect(() => {
    if (!selectedShop || !requestFormRef.current) {
      return;
    }

    requestFormRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, [selectedShop]);

  useEffect(() => {
    const loadAllLiveShops = async () => {
      setLoading(true);

      try {
        const res = await API.get("/press");
        const incomingShops = Array.isArray(res.data) ? res.data : [];

        if (incomingShops.length === 0) {
          setShops(enrichShopCollection(buildFallbackShops(DEFAULT_LOCATION), DEFAULT_LOCATION));
          setStatus("Abhi live shops add nahi hue hain, isliye curated partners dikh rahe hain.");
        } else {
          setShops(enrichShopCollection(incomingShops, userLocation));
          setStatus("Shopkeeper ke added live shops yahan dikh rahe hain. Current location add karke nearby shops dekh sakte ho.");
        }
      } catch (requestError) {
        console.log(requestError);
        setShops(enrichShopCollection(buildFallbackShops(DEFAULT_LOCATION), DEFAULT_LOCATION));
        setStatus(
          `${getApiErrorMessage(
            requestError,
            "Live shops API unavailable hai."
          )} Curated partners are being shown on the home page.`
        );
      } finally {
        setLoading(false);
      }
    };

    loadAllLiveShops();
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus("Browser me location support nahi hai, isliye all live shops hi dikh rahe hain.");
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const nextLocation = [lat, lng];
        setUserLocation(nextLocation);
        setShopScope("nearby");
        setLoading(true);

        try {
          const res = await API.get(`/press/nearby?lat=${lat}&lng=${lng}`);
          const incomingShops = Array.isArray(res.data) ? res.data : [];

          if (incomingShops.length === 0) {
            setShops(enrichShopCollection(buildFallbackShops(nextLocation), nextLocation));
            setStatus("Aapke nearby live shops nahi mile, isliye curated partners dikh rahe hain.");
          } else {
            setShops(enrichShopCollection(incomingShops, nextLocation));
            setStatus("Aapke current location ke nearby shops dikh rahe hain.");
          }
        } catch (requestError) {
          console.log(requestError);
          setStatus(getApiErrorMessage(requestError, "Nearby shops load nahi ho paaye."));
        } finally {
          setLoading(false);
          setLocating(false);
        }
      },
      (error) => {
        if (error?.code === 1) {
          setStatus("Location permission deny ho gayi. Filhal all live shops hi dikh rahe hain.");
        } else {
          setStatus("Current location detect nahi ho paayi. Filhal all live shops hi dikh rahe hain.");
        }
        setLocating(false);
      }
    );
  };

  const handleShowAllShops = async () => {
    setShopScope("all");
    setLoading(true);

    try {
      const res = await API.get("/press");
      const incomingShops = Array.isArray(res.data) ? res.data : [];

      if (incomingShops.length === 0) {
        setShops(enrichShopCollection(buildFallbackShops(DEFAULT_LOCATION), DEFAULT_LOCATION));
        setStatus("Abhi live shops add nahi hue hain, isliye curated partners dikh rahe hain.");
      } else {
        setShops(enrichShopCollection(incomingShops, userLocation));
        setStatus("All live shops dikh rahe hain. Current location add karke nearby shops par switch kar sakte ho.");
      }
    } catch (requestError) {
      console.log(requestError);
      setStatus(getApiErrorMessage(requestError, "All shops load nahi ho paaye."));
    } finally {
      setLoading(false);
    }
  };

  const handleOrderChange = (event) => {
    setOrderForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleRequestOrder = async (event) => {
    event.preventDefault();

    if (!selectedShop) {
      return;
    }

    if (!isBookableShop(selectedShop)) {
      setOrderMessageTone("warning");
      setOrderMessage("Ye curated preview shop hai. Live booking ke liye koi real nearby shop select karo.");
      return;
    }

    if (!localStorage.getItem("token")) {
      setOrderMessageTone("warning");
      setOrderMessage("Please login first to request a press order.");
      return;
    }

    if (!orderForm.pickupAddress.trim()) {
      setOrderMessageTone("warning");
      setOrderMessage("Pickup address bharna zaroori hai.");
      return;
    }

    setSubmittingOrder(true);
    setOrderMessage("");
    setOrderMessageTone("neutral");
    setPaymentStage(orderForm.paymentMode === "online" ? "processing" : "idle");

    try {
      const res = await API.post("/orders", {
        pressShop: selectedShop._id,
        clothesCount: Number(orderForm.clothesCount),
        pickupAddress: orderForm.pickupAddress,
        notes: orderForm.notes,
        paymentMode: orderForm.paymentMode,
        paymentMethod: orderForm.paymentMethod,
        clothType: orderForm.clothType,
        serviceType: orderForm.serviceType,
        pickupDate: orderForm.pickupDate,
        pickupTime: orderForm.pickupTime,
        deliveryDate: orderForm.deliveryDate,
        deliveryTime: orderForm.deliveryTime,
        couponCode: orderForm.couponCode
      });

      if (orderForm.paymentMode === "online" && res.data.paymentSession) {
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
        setPaymentStage("success");
        setOrderMessageTone("success");
        setOrderMessage(`Order created and payment verified for ${res.data.pressShop.shopName}.`);
      } else {
        setPaymentStage("success");
        setOrderMessageTone("success");
        setOrderMessage(`Request sent to ${res.data.pressShop.shopName}.`);
      }

      setSelectedShop(null);
      setOrderForm({
        clothesCount: "5",
        pickupAddress: "",
        notes: "",
        paymentMode: "offline",
        paymentMethod: "cash",
        clothType: "Daily wear",
        serviceType: "Steam press",
        pickupDate: "",
        pickupTime: "",
        deliveryDate: "",
        deliveryTime: "",
        couponCode: ""
      });
    } catch (requestError) {
      setPaymentStage("idle");
      setOrderMessageTone("warning");
      setOrderMessage(getApiErrorMessage(requestError, "Order create nahi ho paaya."));
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <main className="home-shops">
      {!currentUser && <OpeningIntro />}

      <section className="home-shops__hero">
        <div className="home-shops__hero-grid">
          <div className="home-shops__hero-copy">
            <div className="home-shops__hero-badges">
              <span>Animated local-first marketplace</span>
              <span>Pickup to payment in one polished flow</span>
            </div>
            <p className="home-shops__eyebrow">PressKardu</p>
            <div className="home-shops__eyebrow-line" />
            <h1>Local press pickup, premium finish, one smooth flow.</h1>
            <p className="home-shops__copy">
              Compare trusted press shops, check pickup speed, and open each
              location map right inside the card before you book.
            </p>

            <div className="home-shops__signals">
              <span>Doorstep pickup</span>
              <span>Fast local turnaround</span>
              <span>Transparent per-cloth pricing</span>
            </div>

            <div className="home-shops__actions">
              <Link className="home-shops__link" to="/orders">My orders</Link>
              <Link className="home-shops__link home-shops__link--secondary" to="/shops">Full map view</Link>
            </div>

            <div className="home-shops__stats">
              <article>
                <strong>{shops.length || 6}+</strong>
                <span>Available partners</span>
              </article>
              <article>
                <strong>{averagePrice ? `Rs. ${averagePrice}` : "Rs. 14"}</strong>
                <span>Average starting price</span>
              </article>
              <article>
                <strong>{fastestEta}</strong>
                <span>Fast pickup window</span>
              </article>
            </div>

            <div className="home-shops__hero-marquee" aria-hidden="true">
              <span>Doorstep pickup</span>
              <span>Signature payment flow</span>
              <span>Live order timeline</span>
              <span>Premium local partners</span>
            </div>
          </div>

          <div className="home-shops__hero-visual">
            <div className="home-shops__orb home-shops__orb--one" />
            <div className="home-shops__orb home-shops__orb--two" />
            <div className="home-shops__float-card home-shops__float-card--eta">
              <strong>18 min</strong>
              <span>Fastest pickup window nearby</span>
            </div>
            <div className="home-shops__float-card home-shops__float-card--trust">
              <strong>Secure</strong>
              <span>Backend verified payments</span>
            </div>
            <div className="home-shops__visual-card">
              <div className="home-shops__visual-head">
                <div>
                  <p>Live service preview</p>
                  <h2>Sharper, faster, cleaner</h2>
                </div>
                <span>Animated</span>
              </div>
              <LazyPressScene />
              <div className="home-shops__visual-foot">
                <div>
                  <strong>Premium pressing</strong>
                  <span>With map-first discovery and instant request flow</span>
                </div>
                <div className="home-shops__pulse">
                  <span />
                  Nearby active
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {loading && <LoadingCards count={2} />}
      <Toast message={orderMessage || status} tone={orderMessage ? orderMessageTone : "info"} />
      {!loading && status && <p className="home-shops__state">{status}</p>}
      {!loading && shops.length === 0 && (
        <p className="home-shops__state">No press shops found near your location yet.</p>
      )}

      {featuredShop && (
        <section className="featured-spotlight">
          <div className="featured-spotlight__copy">
            <p className="home-shops__eyebrow">Featured this moment</p>
            <h2>{featuredShop.shopName}</h2>
            <p>{featuredShop.about || "A polished local favorite with faster pickup, stronger finishing, and cleaner order visibility."}</p>
            <div className="featured-spotlight__meta">
              <span>{featuredShop.pickupWindow}</span>
              <span>{featuredShop.eta}</span>
              <span>Rs. {featuredShop.pricePerCloth || 12} per cloth</span>
            </div>
          </div>
          <div className="featured-spotlight__panel">
            <strong>Before</strong>
            <div className="featured-spotlight__cloth featured-spotlight__cloth--before">Creased pickup bag</div>
            <strong>After</strong>
            <div className="featured-spotlight__cloth featured-spotlight__cloth--after">Pressed and delivery ready</div>
          </div>
        </section>
      )}

      <section className="home-shops__section-head">
        <div>
          <p className="home-shops__eyebrow">{shopScope === "nearby" ? "Nearby selection" : "Live shop selection"}</p>
          <h2>{shopScope === "nearby" ? "Choose a nearby shop" : "Choose from all live shops"}</h2>
        </div>
        <p>
          Shopkeeper jab address ke saath shop add karega to wo yahan show hoga. User current location add kare to list nearby shops par shift ho jayegi.
        </p>
      </section>

      <section className="home-shops__scope-actions">
        <button className="home-shops__scope-button" type="button" onClick={handleUseCurrentLocation} disabled={locating}>
          {locating ? "Getting current location..." : "Use current location"}
        </button>
        <button className="home-shops__scope-button home-shops__scope-button--secondary" type="button" onClick={handleShowAllShops}>
          Show all live shops
        </button>
      </section>

      <section className="home-shops__search">
        <input
          className="home-shops__search-input"
          value={shopSearch}
          onChange={(event) => setShopSearch(event.target.value)}
          placeholder="Search by shop name, area, or specialty"
        />
      </section>

      <section className="home-shops__stack">
        {filteredShops.map((shop, index) => (
          <PressCard
            key={shop._id || `${shop.shopName}-${index}`}
            shop={shop}
            index={index}
            actionLabel={
              isUser
                ? currentUser
                  ? (isBookableShop(shop) ? "Open request form" : "Preview only")
                  : (isBookableShop(shop) ? "Login to request" : "Preview only")
                : null
            }
            onAction={() => {
              if (!currentUser) {
                setOrderMessageTone("warning");
                setOrderMessage("Login karo, phir request form khul jayega.");
                navigate("/login");
                return;
              }

              if (!isBookableShop(shop)) {
                setOrderMessageTone("warning");
                setOrderMessage("Curated fallback shops par live booking available nahi hai.");
                return;
              }

              setSelectedShop(shop);
              setOrderMessageTone("info");
              setOrderMessage(`"${shop.shopName}" ke liye request form neeche khul gaya hai. Pickup address bharke confirm karo.`);
            }}
            actionDisabled={currentUser ? !isBookableShop(shop) : false}
            secondaryActionLabel={openMapShopId === shop._id ? "Hide map" : "Open map"}
            onSecondaryAction={() => setOpenMapShopId((current) => (current === shop._id ? null : shop._id))}
            tertiaryActionLabel="View details"
            onTertiaryAction={() => navigate(`/shops/${shop._id}`)}
            className="home-shops__press-card"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            {openMapShopId === shop._id && Array.isArray(shop.location?.coordinates) && shop.location.coordinates.length >= 2 && (
              <div className="press-card__map-wrap">
                <div className="press-card__map-meta">
                  <span>Shop location</span>
                  <p>{shop.address}</p>
                </div>
                <div className="press-card__map">
                  <Map
                    shops={[shop]}
                    userLocation={userLocation}
                    center={[shop.location.coordinates[1], shop.location.coordinates[0]]}
                    zoom={15}
                  />
                </div>
              </div>
            )}
          </PressCard>
        ))}
      </section>

      {!loading && filteredShops.length === 0 && shopSearch.trim() && (
        <p className="home-shops__state home-shops__state--warning">
          Is search se koi shop match nahi hui. Dusra keyword try karo.
        </p>
      )}

      {selectedShop && (
        <section ref={requestFormRef} className={`order-request${paymentStage !== "idle" ? ` order-request--${paymentStage}` : ""}`}>
          <div className="order-request__ambient" aria-hidden="true" />
          <div>
            <p className="order-request__eyebrow">New request</p>
            <h2>Request pickup from {selectedShop.shopName}</h2>
            <p className="order-request__intro">
              Choose your pickup details and let the service feel instant, smooth, and trackable.
            </p>
          </div>

          <form className="order-request__form" onSubmit={handleRequestOrder}>
            <div className="order-request__split">
              <label>
                <span>Clothes count</span>
                <input name="clothesCount" type="number" min="1" value={orderForm.clothesCount} onChange={handleOrderChange} />
              </label>

              <label>
                <span>Payment mode</span>
                <select name="paymentMode" value={orderForm.paymentMode} onChange={handleOrderChange}>
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                </select>
              </label>
            </div>

            <div className="order-request__split">
              <label>
                <span>Cloth type</span>
                <select name="clothType" value={orderForm.clothType} onChange={handleOrderChange}>
                  <option value="Daily wear">Daily wear</option>
                  <option value="Office wear">Office wear</option>
                  <option value="Premium fabric">Premium fabric</option>
                  <option value="Wedding wear">Wedding wear</option>
                </select>
              </label>

              <label>
                <span>Service type</span>
                <select name="serviceType" value={orderForm.serviceType} onChange={handleOrderChange}>
                  <option value="Steam press">Steam press</option>
                  <option value="Wash and iron">Wash and iron</option>
                  <option value="Dry clean">Dry clean</option>
                  <option value="Express press">Express press</option>
                </select>
              </label>
            </div>

            <label>
              <span>Pickup address</span>
              <input name="pickupAddress" placeholder="Where should the shopkeeper collect the clothes?" value={orderForm.pickupAddress} onChange={handleOrderChange} />
            </label>

            <div className="order-request__split">
              <label>
                <span>Pickup date</span>
                <input name="pickupDate" type="date" value={orderForm.pickupDate} onChange={handleOrderChange} />
              </label>
              <label>
                <span>Pickup time</span>
                <input name="pickupTime" type="time" value={orderForm.pickupTime} onChange={handleOrderChange} />
              </label>
            </div>

            <div className="order-request__split">
              <label>
                <span>Delivery date</span>
                <input name="deliveryDate" type="date" value={orderForm.deliveryDate} onChange={handleOrderChange} />
              </label>
              <label>
                <span>Delivery time</span>
                <input name="deliveryTime" type="time" value={orderForm.deliveryTime} onChange={handleOrderChange} />
              </label>
            </div>

            <div className="order-request__split">
              <label>
                <span>Payment method</span>
                <select name="paymentMethod" value={orderForm.paymentMethod} onChange={handleOrderChange}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </label>
              <label>
                <span>Coupon code</span>
                <input name="couponCode" placeholder="WELCOME20" value={orderForm.couponCode} onChange={handleOrderChange} />
              </label>
            </div>

            <label>
              <span>Notes</span>
              <input name="notes" placeholder="Special instructions for ironing or delivery" value={orderForm.notes} onChange={handleOrderChange} />
            </label>

            <div className="order-request__actions">
              <button type="submit" disabled={submittingOrder}>
                {submittingOrder ? (orderForm.paymentMode === "online" ? "Opening checkout..." : "Sending...") : "Confirm request"}
              </button>
              <button type="button" className="order-request__cancel" onClick={() => setSelectedShop(null)}>
                Cancel
              </button>
            </div>
          </form>

          {paymentStage === "processing" && (
            <div className="payment-status payment-status--processing">
              <div className="payment-status__spinner" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <strong>Preparing secure checkout</strong>
              <p>We are creating your payment session and opening the gateway.</p>
            </div>
          )}

          {paymentStage === "success" && orderMessageTone === "success" && (
            <div className="payment-status payment-status--success">
              <div className="payment-status__burst" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <strong>Payment flow completed</strong>
              <p>Your order is now inside the premium tracked flow.</p>
            </div>
          )}
        </section>
      )}

      <section className="dashboard-grid home-feature-grid">
        <article className="dashboard-card">
          <p className="dashboard-eyebrow">How it works</p>
          <h2>Book in three steps</h2>
          <div className="journey-steps">
            <article className="journey-step">
              <strong>1. Discover</strong>
              <span>Pick a nearby press shop with the best timing and price.</span>
            </article>
            <article className="journey-step">
              <strong>2. Schedule</strong>
              <span>Choose pickup and delivery slots with service preferences.</span>
            </article>
            <article className="journey-step">
              <strong>3. Track</strong>
              <span>Track the order from placed to delivered.</span>
            </article>
          </div>
        </article>
        <article className="dashboard-card">
          <p className="dashboard-eyebrow">Testimonials</p>
          <h2>What users love</h2>
          <div className="review-list">
            <article className="review-card">
              <strong>Neha</strong>
              <p>Order tracking made the whole pickup flow feel reliable and premium.</p>
            </article>
            <article className="review-card">
              <strong>Arjun</strong>
              <p>Map-based discovery helped me compare shops much faster than WhatsApp calling.</p>
            </article>
            <article className="review-card">
              <strong>Karan</strong>
              <p>The intro, booking flow, and status updates make the product feel far more polished than a simple laundry app.</p>
            </article>
          </div>
        </article>
        <article className="dashboard-card">
          <p className="dashboard-eyebrow">FAQ</p>
          <h2>Quick answers</h2>
          <ul className="detail-list">
            <li>Online payment now requires backend signature verification instead of trusting direct success.</li>
            <li>You can save favorite shops, review notifications, and rebook from the dashboard.</li>
            <li>Shopkeepers can reject requests, update progress, and share delivery tracking from the orders page.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}

export default Home;
