import { useState } from "react";

import API from "../services/api";
import LazyPressScene from "../components/LazyPressScene";
import OpeningIntro from "../components/OpeningIntro";
import LocationPickerMap from "../components/LocationPickerMap";
import { Link, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../utils/apiError";
import { saveSession } from "../utils/session";
import Toast from "../components/Toast";

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
    serviceRadiusKm: "5"
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
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
    setMessage("Map se shop location select ho gayi.");
  };

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
      setMessage("Signup completed successfully.");
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
              <label className="auth-field">
                <span className="auth-field__label">Email</span>
                <input className="auth-field__input" name="email" type="email" placeholder="name@example.com" onChange={handleChange} value={form.email} required autoComplete="email" />
              </label>

              <label className="auth-field">
                <span className="auth-field__label">Phone</span>
                <input className="auth-field__input" name="phone" placeholder="Mobile number" onChange={handleChange} value={form.phone} autoComplete="tel" />
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

                <label className="auth-field">
                  <span className="auth-field__label">Shop address</span>
                  <input className="auth-field__input" name="address" placeholder="Full shop address" onChange={handleChange} value={form.address} required={form.role === "presswala"} autoComplete="street-address" />
                </label>

                <input type="hidden" name="latitude" value={form.latitude} />
                <input type="hidden" name="longitude" value={form.longitude} />

                <div className="auth-location-card">
                  <div className="auth-location-card__head">
                    <strong>Shop location</strong>
                    <span>
                      {form.latitude && form.longitude
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
              </div>
            )}

            <label className="auth-field">
              <span className="auth-field__label">Password</span>
              <input
                className="auth-field__input"
                name="password"
                type="password"
                placeholder="Minimum 6 characters"
                onChange={handleChange}
                value={form.password}
                required
                autoComplete="new-password"
              />
            </label>

            <button type="submit" disabled={loading}>
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
