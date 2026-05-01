import { useEffect, useRef, useState } from "react";

import API from "../services/api";
import LazyPressScene from "../components/LazyPressScene";
import OpeningIntro from "../components/OpeningIntro";
import LocationPickerMap from "../components/LocationPickerMap";
import { Link, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../utils/apiError";
import { saveSession } from "../utils/session";
import Toast from "../components/Toast";
import AuthVisibilityField from "../components/AuthVisibilityField";

function Signup() {
  const navigate = useNavigate();
  const [showShell, setShowShell] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "user",
    shopName: "",
    address: "",
    latitude: "",
    longitude: "",
    pricePerCloth: "",
    serviceRadiusKm: "5",
    shopPhotoDataUrl: "",
    phoneOtp: "",
    phoneOtpVerified: false
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpMeta, setOtpMeta] = useState({ retryAfterSeconds: 0, provider: "" });
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const lastResolvedAddressRef = useRef("");

  useEffect(() => {
    if (otpMeta.retryAfterSeconds <= 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setOtpMeta((current) => ({
        ...current,
        retryAfterSeconds: Math.max(0, current.retryAfterSeconds - 1)
      }));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [otpMeta.retryAfterSeconds]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
      ...(e.target.name === "phone" ? { phoneOtpVerified: false } : {})
    });
  };

  const handleShopPhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setForm((current) => ({ ...current, shopPhotoDataUrl: "" }));
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Shop photo ke liye image file choose karo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        shopPhotoDataUrl: typeof reader.result === "string" ? reader.result : ""
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSendPhoneOtp = async () => {
    if (!form.phone.trim()) {
      setMessage("Pehle phone number enter karo.");
      return;
    }

    try {
      setOtpSending(true);
      const res = await API.post("/auth/phone-verification/send-otp", {
        phone: form.phone
      });
      setOtpMeta({
        retryAfterSeconds: Number(res.data.retryAfterSeconds || 0),
        provider: res.data.delivery?.provider || ""
      });
      setMessage(res.data.deliveryHint || res.data.message || "OTP sent.");
    } catch (error) {
      setOtpMeta({
        retryAfterSeconds: Number(error?.response?.data?.retryAfterSeconds || 0),
        provider: ""
      });
      setMessage(getApiErrorMessage(error, "Phone OTP bhejna possible nahi hua."));
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!form.phone.trim() || !form.phoneOtp.trim()) {
      setMessage("Phone number aur OTP dono enter karo.");
      return;
    }

    try {
      setOtpVerifying(true);
      const res = await API.post("/auth/phone-verification/verify-otp", {
        phone: form.phone,
        otp: form.phoneOtp
      });
      setForm((current) => ({
        ...current,
        phoneOtpVerified: true
      }));
      setOtpMeta((current) => ({
        ...current,
        retryAfterSeconds: 0
      }));
      setMessage(res.data.message || "Phone verified.");
    } catch (error) {
      setForm((current) => ({
        ...current,
        phoneOtpVerified: false
      }));
      setMessage(getApiErrorMessage(error, "Phone OTP verify nahi hua."));
    } finally {
      setOtpVerifying(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Browser location support available nahi hai. Map par pin drop karke location choose karo.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude)
        }));
        setMessage("Current location added for the shop.");
      },
      (error) => {
        if (error?.code === 1) {
          setMessage("Location permission deny ho gayi. Browser me location allow karo ya map par pin choose karo.");
          return;
        }

        if (error?.code === 2) {
          setMessage("Current location detect nahi ho pa rahi. Map par manually pin choose karo.");
          return;
        }

        setMessage("Current location fetch nahi ho pa rahi. HTTPS, browser permission, ya device GPS issue ho sakta hai. Map par pin choose karo.");
      }
    );
  };

  const handleLocationPick = ({ latitude, longitude }) => {
    setForm((current) => ({
      ...current,
      latitude: String(latitude),
      longitude: String(longitude)
    }));
    lastResolvedAddressRef.current = form.address.trim().toLowerCase();
    setMessage("Map se shop location select ho gayi.");
  };

  useEffect(() => {
    if (form.role !== "presswala") {
      setIsResolvingAddress(false);
      return undefined;
    }

    const query = form.address.trim();
    if (query.length < 6) {
      setIsResolvingAddress(false);
      return undefined;
    }

    const normalizedQuery = query.toLowerCase();
    if (normalizedQuery === lastResolvedAddressRef.current) {
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsResolvingAddress(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json"
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Address lookup failed with ${response.status}`);
        }

        const results = await response.json();
        const match = Array.isArray(results) ? results[0] : null;

        if (!match?.lat || !match?.lon) {
          return;
        }

        lastResolvedAddressRef.current = normalizedQuery;
        setForm((current) => ({
          ...current,
          latitude: String(match.lat),
          longitude: String(match.lon)
        }));
        setMessage("Typed address se map location update ho gayi.");
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error resolving address:", error);
        }
      } finally {
        setIsResolvingAddress(false);
      }
    }, 700);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [form.address, form.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const payload = {
        ...form,
        pricePerCloth: form.pricePerCloth ? Number(form.pricePerCloth) : undefined,
        serviceRadiusKm: form.serviceRadiusKm ? Number(form.serviceRadiusKm) : undefined
      };

      const res = await API.post("/auth/signup", payload);
      saveSession({ token: res.data.token, user: res.data.user });
      setMessage(res.data.message || "Signup completed successfully.");
      navigate(res.data.user.role === "presswala" ? "/shops" : "/");
    } catch (error) {
      console.error("Error signing up:", error);
      setMessage(getApiErrorMessage(error, "Signup complete nahi ho paaya. Dobara try karo."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <OpeningIntro
        compact
        showActions={false}
        title="Walk in, set the cloth, and open your account flow."
        description="As soon as the pressing starts, your signup journey appears below with the same premium tone."
        onReveal={() => setShowShell(true)}
      />
      <Toast message={message} tone="warning" />
      <section className={`auth-shell${showShell ? " auth-shell--visible" : ""}`}>
        <aside className="auth-panel auth-panel--intro">
          <div className="auth-panel__veil" aria-hidden="true" />
          <p className="auth-card__eyebrow">Create account</p>
          <h1>Join a polished local pressing network built for speed.</h1>
          <p className="auth-panel__copy">
            Sign up as a customer to book nearby services or as a shopkeeper to
            receive and manage new pickup requests.
          </p>

          <div className="auth-panel__chips">
            <span>Customer booking flow</span>
            <span>Shopkeeper dashboard</span>
            <span>Animated local-first UI</span>
          </div>

          <div className="auth-panel__metrics">
            <article>
              <strong>Fast setup</strong>
              <span>Start discovering or accepting orders right away</span>
            </article>
            <article>
              <strong>Location aware</strong>
              <span>Bring your shop online with map-ready coordinates</span>
            </article>
          </div>

          <div className="auth-panel__spotlight">
            <strong>Designed to move</strong>
            <span>Animated onboarding with cleaner discovery, booking, and shop activation.</span>
          </div>

          <div className="auth-panel__scene-card">
            <div className="auth-panel__scene-copy">
              <strong>Premium service identity</strong>
              <span>Warm, modern, animated and built for local trust</span>
            </div>
            <LazyPressScene />
          </div>
        </aside>

        <section className="auth-card auth-card--wide">
          <div className="auth-card__halo" aria-hidden="true" />
          <p className="auth-card__eyebrow">Create account</p>
          <h2>Join PressKardu</h2>
          <p className="auth-card__copy">
            Choose your account type and complete the setup in one flow.
          </p>
          {form.role === "presswala" && (
            <p className="auth-card__message">
              New shop listings stay hidden until an admin reviews the address, phone, and map pin.
            </p>
          )}

          <div className="auth-card__mini-stats" aria-hidden="true">
            <article>
              <strong>Map-ready</strong>
              <span>shop onboarding for local discovery</span>
            </article>
            <article>
              <strong>Instant</strong>
              <span>customer and shopkeeper routing</span>
            </article>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-role-toggle" role="radiogroup" aria-label="Account type">
              <button
                className={form.role === "user" ? "auth-role-toggle__item auth-role-toggle__item--active" : "auth-role-toggle__item"}
                type="button"
                onClick={() => setForm((current) => ({ ...current, role: "user" }))}
              >
                Customer
              </button>
              <button
                className={form.role === "presswala" ? "auth-role-toggle__item auth-role-toggle__item--active" : "auth-role-toggle__item"}
                type="button"
                onClick={() => setForm((current) => ({ ...current, role: "presswala" }))}
              >
                Shopkeeper
              </button>
            </div>

            <input type="hidden" name="role" value={form.role} />

            <label className="auth-field">
              <span className="auth-field__label">Full name</span>
              <input className="auth-field__input" name="name" placeholder="Your name" onChange={handleChange} value={form.name} required autoComplete="name" />
            </label>

            <div className="auth-form__split">
              <AuthVisibilityField
                label="Email"
                name="email"
                hiddenType="password"
                visibleType="email"
                placeholder="name@example.com"
                onChange={handleChange}
                value={form.email}
                required
                autoComplete="email"
              />

              <label className="auth-field">
                <span className="auth-field__label">Phone</span>
                <input className="auth-field__input" name="phone" placeholder="Mobile number" onChange={handleChange} value={form.phone} autoComplete="tel" required={form.role === "presswala"} />
              </label>
            </div>

            {form.role === "presswala" && (
              <div className="auth-section">
                <div className="auth-section__head">
                  <strong>Shop details</strong>
                  <span>Add the service area customers will discover.</span>
                </div>

                <label className="auth-field">
                  <span className="auth-field__label">Shop name</span>
                  <input className="auth-field__input" name="shopName" placeholder="Press shop name" onChange={handleChange} value={form.shopName} required={form.role === "presswala"} />
                </label>

                <div className="auth-form__split">
                  <label className="auth-field">
                    <span className="auth-field__label">Phone OTP</span>
                    <input className="auth-field__input" name="phoneOtp" placeholder="Enter OTP" onChange={handleChange} value={form.phoneOtp} required={form.role === "presswala"} />
                  </label>
                  <div className="auth-location-card">
                    <div className="auth-location-card__head">
                      <strong>{form.phoneOtpVerified ? "Phone verified" : "Verify phone"}</strong>
                      <span>{form.phoneOtpVerified ? "OTP verified for this shop phone number." : "Send OTP to confirm the shopkeeper phone number."}</span>
                    </div>
                    {!form.phoneOtpVerified && otpMeta.retryAfterSeconds > 0 && (
                      <p className="auth-card__message">
                        Resend unlocks in {otpMeta.retryAfterSeconds}s.
                      </p>
                    )}
                    {!form.phoneOtpVerified && otpMeta.provider && (
                      <p className="auth-card__message">
                        Current delivery route: {otpMeta.provider}.
                      </p>
                    )}
                    <div className="auth-location-card__actions">
                      <button className="auth-form__secondary" type="button" onClick={handleSendPhoneOtp} disabled={otpSending || otpMeta.retryAfterSeconds > 0}>
                        {otpSending ? "Sending..." : "Send OTP"}
                      </button>
                      <button className="auth-form__secondary" type="button" onClick={handleVerifyPhoneOtp} disabled={otpVerifying}>
                        {otpVerifying ? "Verifying..." : "Verify OTP"}
                      </button>
                    </div>
                  </div>
                </div>

                <label className="auth-field">
                  <span className="auth-field__label">Shop address</span>
                  <input className="auth-field__input" name="address" placeholder="Full shop address" onChange={handleChange} value={form.address} required={form.role === "presswala"} autoComplete="street-address" />
                </label>

                <p className="auth-card__message">
                  Use the exact shop address and select the real location on the map. Wrong or fake locations are kept pending or rejected.
                </p>

                <input type="hidden" name="latitude" value={form.latitude} />
                <input type="hidden" name="longitude" value={form.longitude} />

                <div className="auth-location-card">
                  <div className="auth-location-card__head">
                    <strong>Shop location</strong>
                    <span>
                      {isResolvingAddress
                        ? "Address se map location match ki ja rahi hai..."
                        : form.latitude && form.longitude
                        ? `Lat ${Number(form.latitude).toFixed(5)}, Lng ${Number(form.longitude).toFixed(5)}`
                        : "Current location lo ya map par pin choose karo"}
                    </span>
                  </div>

                  <div className="auth-location-card__actions">
                    <button className="auth-form__secondary" type="button" onClick={useCurrentLocation}>
                      Use current location
                    </button>
                    <button
                      className="auth-form__secondary"
                      type="button"
                      onClick={() => setShowLocationPicker((current) => !current)}
                    >
                      {showLocationPicker ? "Hide map picker" : "Pick on map"}
                    </button>
                  </div>
                </div>

                {showLocationPicker && (
                  <div className="auth-location-picker">
                    <p className="auth-location-picker__hint">Map par exact shop spot par click karo.</p>
                    <div className="auth-location-picker__map">
                      <LocationPickerMap
                        value={form.latitude && form.longitude
                          ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
                          : null}
                        onChange={handleLocationPick}
                      />
                    </div>
                  </div>
                )}

                <div className="auth-form__split">
                  <label className="auth-field">
                    <span className="auth-field__label">Price per cloth</span>
                    <input className="auth-field__input" name="pricePerCloth" type="number" min="0" placeholder="10" onChange={handleChange} value={form.pricePerCloth} />
                  </label>

                  <label className="auth-field">
                    <span className="auth-field__label">Service radius (km)</span>
                    <input className="auth-field__input" name="serviceRadiusKm" type="number" min="1" placeholder="5" onChange={handleChange} value={form.serviceRadiusKm} />
                  </label>
                </div>

                <label className="auth-field">
                  <span className="auth-field__label">Shop photo</span>
                  <input className="auth-field__input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleShopPhotoChange} required={form.role === "presswala"} />
                </label>
                {form.shopPhotoDataUrl && (
                  <div className="auth-location-picker">
                    <p className="auth-location-picker__hint">Shop photo preview for admin review.</p>
                    <img src={form.shopPhotoDataUrl} alt="Shop preview" style={{ width: "100%", maxHeight: "240px", objectFit: "cover", borderRadius: "20px" }} />
                  </div>
                )}
              </div>
            )}

            <AuthVisibilityField
              label="Password"
              name="password"
              hiddenType="password"
              visibleType="text"
              placeholder="Minimum 8 characters with letters and numbers"
              onChange={handleChange}
              value={form.password}
              required
              autoComplete="new-password"
            />

            <button type="submit" disabled={loading || (form.role === "presswala" && !form.phoneOtpVerified)}>
              {loading ? "Creating account..." : "Signup"}
            </button>
          </form>

          <p className="auth-card__switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default Signup;
