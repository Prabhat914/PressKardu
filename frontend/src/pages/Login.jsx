import { useState } from "react";
import API from "../services/api";
import LazyPressScene from "../components/LazyPressScene";
import OpeningIntro from "../components/OpeningIntro";
import { Link, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../utils/apiError";
import { enableGuestDemo, saveSession } from "../utils/session";
import Toast from "../components/Toast";
import AuthVisibilityField from "../components/AuthVisibilityField";

function Login() {
  const navigate = useNavigate();
  const [showShell, setShowShell] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password:""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [phoneVerification, setPhoneVerification] = useState({
    phone: "",
    otp: ""
  });
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handlePhoneVerificationChange = (e) => {
    setPhoneVerification({
      ...phoneVerification,
      [e.target.name]: e.target.value
    });
  };

  const handleSendPhoneOtp = async () => {
    if (!phoneVerification.phone.trim()) {
      setMessage("Enter the phone number linked with this account.");
      return;
    }

    try {
      setOtpSending(true);
      const res = await API.post("/auth/phone-verification/send-otp", {
        phone: phoneVerification.phone
      });
      const debugText = res.data.debugOtp ? ` OTP: ${res.data.debugOtp}` : "";
      setMessage(`${res.data.deliveryHint || res.data.message || "OTP sent."}${debugText}`);
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Could not send the phone OTP."));
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneVerification.phone.trim() || !phoneVerification.otp.trim()) {
      setMessage("Enter both phone number and OTP.");
      return;
    }

    try {
      setOtpVerifying(true);
      const res = await API.post("/auth/phone-verification/verify-otp", {
        phone: phoneVerification.phone,
        otp: phoneVerification.otp
      });
      setShowPhoneVerification(false);
      setMessage(res.data.message || "Phone verified. Login again.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Could not verify the phone OTP."));
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await API.post("/auth/login", form);

      saveSession({ token: res.data.token, user: res.data.user });
      navigate(
        res.data.user.role === "admin"
          ? "/admin"
          : res.data.user.role === "presswala"
          ? "/shops"
          : "/"
      );

    } catch (error) {
      console.log(error);
      if (error?.response?.data?.verificationRequired === "phone") {
        setShowPhoneVerification(true);
      }
      setMessage(getApiErrorMessage(error, "Login complete nahi ho paaya. Dobara try karo."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <OpeningIntro
        compact
        showActions={false}
        title="A cleaner start to your next pressing request."
        description="The scene plays first, and as the pressing begins your account access appears right after."
        onReveal={() => setShowShell(true)}
      />
      <section className={`auth-shell${showShell ? " auth-shell--visible" : ""}`}>
        <aside className="auth-panel auth-panel--intro">
          <div className="auth-panel__veil" aria-hidden="true" />
          <p className="auth-card__eyebrow">Welcome back</p>
          <h1>Sign in and pick the best local press service in minutes.</h1>
          <p className="auth-panel__copy">
            Customers can compare nearby partners and request pickup instantly.
            Shopkeepers can manage new orders and update delivery progress.
          </p>

          <div className="auth-panel__chips">
            <span>Live shop comparison</span>
            <span>In-card location maps</span>
            <span>Fast request flow</span>
          </div>

          <div className="auth-panel__spotlight">
            <strong>Trusted motion</strong>
            <span>Every step is designed to feel fast, guided, and premium.</span>
          </div>

          <div className="auth-panel__scene-card">
            <div className="auth-panel__scene-copy">
              <strong>Animated service preview</strong>
              <span>Modern pressing experience with premium local feel</span>
            </div>
            <LazyPressScene />
          </div>
        </aside>

        <section className="auth-card auth-card--wide">
          <div className="auth-card__halo" aria-hidden="true" />
          <p className="auth-card__eyebrow">Account access</p>
          <h2>Login to PressKardu</h2>
          <p className="auth-card__copy">
            Continue to your orders, nearby shops, and pickup requests.
          </p>
          <Toast message={message} tone="warning" inline />
          <p className="auth-card__message">
            Platform admin bhi isi login page se sign in karega. Admin account public signup se create nahi hota.
          </p>

          <div className="auth-card__mini-stats" aria-hidden="true">
            <article>
              <strong>3</strong>
              <span>quick steps to pickup</span>
            </article>
            <article>
              <strong>Live</strong>
              <span>timeline and status flow</span>
            </article>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
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

            <AuthVisibilityField
              label="Password"
              name="password"
              hiddenType="password"
              visibleType="text"
              placeholder="Password"
              onChange={handleChange}
              value={form.password}
              required
              autoComplete="current-password"
            />

            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {showPhoneVerification && (
            <div className="auth-section">
              <div className="auth-section__head">
                <strong>Verify phone</strong>
                <span>OTP bypass nahi hota. Phone verify karo, phir login retry karo.</span>
              </div>
              <div className="auth-form__split">
                <label className="auth-field">
                  <span className="auth-field__label">Phone</span>
                  <input
                    className="auth-field__input"
                    name="phone"
                    placeholder="Mobile number"
                    onChange={handlePhoneVerificationChange}
                    value={phoneVerification.phone}
                    autoComplete="tel"
                  />
                </label>
                <label className="auth-field">
                  <span className="auth-field__label">OTP</span>
                  <input
                    className="auth-field__input"
                    name="otp"
                    placeholder="Enter OTP"
                    onChange={handlePhoneVerificationChange}
                    value={phoneVerification.otp}
                    autoComplete="one-time-code"
                  />
                </label>
              </div>
              <div className="auth-location-card__actions">
                <button className="auth-form__secondary" type="button" onClick={handleSendPhoneOtp} disabled={otpSending}>
                  {otpSending ? "Sending..." : "Send OTP"}
                </button>
                <button className="auth-form__secondary" type="button" onClick={handleVerifyPhoneOtp} disabled={otpVerifying}>
                  {otpVerifying ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            </div>
          )}

          <p className="auth-card__switch">
            New here? <Link to="/signup">Create an account</Link>
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
          <p className="auth-card__switch">
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default Login;
