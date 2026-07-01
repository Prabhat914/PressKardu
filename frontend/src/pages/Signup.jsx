import { useEffect, useRef, useState } from "react";

import API from "../services/api";
import LocationPickerMap from "../components/LocationPickerMap";
import { Link, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../utils/apiError";
import { enableGuestDemo, saveSession } from "../utils/session";
import Toast from "../components/Toast";
import AuthVisibilityField from "../components/AuthVisibilityField";

function Signup() {
  const navigate = useNavigate();
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
    shopPhotoDataUrl: ""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const lastResolvedAddressRef = useRef("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleChange = (role) => {
    setForm((current) => ({
      ...current,
      role
    }));
    setMessage("");
  };

  const handleShopPhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setForm((current) => ({ ...current, shopPhotoDataUrl: "" }));
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file for the shop photo.");
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

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Your browser does not support location access. Drop a pin on the map to choose the shop location.");
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
          setMessage("Location permission was denied. Allow location access in your browser or choose a pin on the map.");
          return;
        }

        if (error?.code === 2) {
          setMessage("Could not detect your current location. Choose a pin manually on the map.");
          return;
        }

        setMessage("Could not fetch your current location. Check HTTPS, browser permissions, or device GPS, then choose a pin on the map.");
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
    setMessage("Shop location selected from the map.");
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
        setMessage("Map location updated from the typed address.");
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
      navigate(
        res.data.user.role === "admin"
          ? "/admin"
          : res.data.user.role === "delivery_partner"
          ? "/delivery"
          : res.data.user.role === "presswala"
          ? "/shops"
          : "/"
      );
    } catch (error) {
      console.error("Error signing up:", error);
      setMessage(getApiErrorMessage(error, "Signup could not be completed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page auth-page--simple">
      <section className="auth-shell auth-shell--simple auth-shell--visible">
        <section className="auth-card auth-card--wide">
          <div className="auth-card__halo" aria-hidden="true" />
          <p className="auth-card__eyebrow">Create account</p>
          <h2>Create your account</h2>
          <p className="auth-card__copy">
            Join as a customer, shopkeeper, or delivery partner.
          </p>
          <Toast message={message} tone="warning" inline />
          {form.role === "presswala" && (
            <p className="auth-card__message">
              Shop listing goes live after admin review.
            </p>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-role-toggle" role="radiogroup" aria-label="Account type">
              <button
                className={form.role === "user" ? "auth-role-toggle__item auth-role-toggle__item--active" : "auth-role-toggle__item"}
                type="button"
                onClick={() => handleRoleChange("user")}
              >
                Customer
              </button>
              <button
                className={form.role === "presswala" ? "auth-role-toggle__item auth-role-toggle__item--active" : "auth-role-toggle__item"}
                type="button"
                onClick={() => handleRoleChange("presswala")}
              >
                Shopkeeper
              </button>
              <button
                className={form.role === "delivery_partner" ? "auth-role-toggle__item auth-role-toggle__item--active" : "auth-role-toggle__item"}
                type="button"
                onClick={() => handleRoleChange("delivery_partner")}
              >
                Delivery partner
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
                hiddenType="email"
                placeholder="name@example.com"
                onChange={handleChange}
                value={form.email}
                required
                autoComplete="email"
                allowToggle={false}
              />

              <label className="auth-field">
                <span className="auth-field__label">Phone</span>
                <input className="auth-field__input" name="phone" placeholder="Mobile number" onChange={handleChange} value={form.phone} autoComplete="tel" required />
              </label>
            </div>

            {form.role === "presswala" && (
              <div className="auth-section">
                <div className="auth-section__head">
                  <strong>Shop details</strong>
                  <span>Add your public shop info.</span>
                </div>

                <label className="auth-field">
                  <span className="auth-field__label">Shop name</span>
                  <input className="auth-field__input" name="shopName" placeholder="Press shop name" onChange={handleChange} value={form.shopName} required={form.role === "presswala"} />
                </label>
                <label className="auth-field">
                  <span className="auth-field__label">Shop address</span>
                  <input className="auth-field__input" name="address" placeholder="Full shop address" onChange={handleChange} value={form.address} required={form.role === "presswala"} autoComplete="street-address" />
                </label>

                <p className="auth-card__message">
                  Use your real shop address and map pin.
                </p>

                <input type="hidden" name="latitude" value={form.latitude} />
                <input type="hidden" name="longitude" value={form.longitude} />

                <div className="auth-location-card">
                  <div className="auth-location-card__head">
                    <strong>Shop location</strong>
                    <span>
                      {isResolvingAddress
                        ? "Matching the typed address to a map location..."
                        : form.latitude && form.longitude
                        ? `Lat ${Number(form.latitude).toFixed(5)}, Lng ${Number(form.longitude).toFixed(5)}`
                        : "Use current location or pick on map"}
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
                    <p className="auth-location-picker__hint">Tap the exact shop spot.</p>
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
                    <p className="auth-location-picker__hint">Shop photo preview.</p>
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

            <button type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Signup"}
            </button>
          </form>

          <p className="auth-card__switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
          <p className="auth-card__switch">
            <button
              type="button"
              className="auth-form__secondary"
              onClick={() => {
                enableGuestDemo();
                navigate("/");
              }}
            >
              Explore as guest
            </button>
          </p>
        </section>
      </section>
    </main>
  );
}

export default Signup;
