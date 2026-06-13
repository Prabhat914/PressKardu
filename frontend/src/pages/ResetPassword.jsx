import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import Toast from "../components/Toast";
import AuthVisibilityField from "../components/AuthVisibilityField";

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: location.state?.email || "",
    otp: "",
    password: "",
    confirmPassword: ""
  });
  const [message, setMessage] = useState(location.state?.recoveryMessage || "");
  const [messageTone, setMessageTone] = useState("info");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const isOtpVerified = Boolean(resetToken);

  const verifyOtp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageTone("warning");

    try {
      const res = await API.post("/auth/verify-reset-otp", {
        email: form.email,
        otp: form.otp
      });
      setResetToken(res.data.resetToken);
      setMessage("");
    } catch (error) {
      setMessageTone("warning");
      setMessage(getApiErrorMessage(error, "The OTP could not be verified."));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setMessageTone("warning");
      setMessage("Password and confirm password must match.");
      return;
    }

    if (!resetToken) {
      setMessageTone("warning");
      setMessage("Verify the OTP first.");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageTone("warning");

    try {
      const res = await API.post("/auth/reset-password", {
        email: form.email,
        resetToken,
        password: form.password
      });
      setMessageTone("success");
      setMessage(res.data.message);
      window.setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setMessageTone("warning");
      setMessage(getApiErrorMessage(error, "The password could not be reset."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell auth-shell--visible">
        <section className="auth-card auth-card--wide">
          <p className="auth-card__eyebrow">Reset access</p>
          <h2>{isOtpVerified ? "Set new password" : "Verify OTP"}</h2>
          <p className="auth-card__copy">
            {isOtpVerified
              ? "Set your new password."
              : "Verify the OTP first. Password fields unlock after verification."}
          </p>

          {!isOtpVerified ? (
            <>
              <form className="auth-form" onSubmit={verifyOtp}>
                <AuthVisibilityField
                  label="Email"
                  hiddenType="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  required
                  autoComplete="email"
                  allowToggle={false}
                />

                <div className="auth-form__split">
                  <label className="auth-field">
                    <span className="auth-field__label">OTP</span>
                    <input
                      className="auth-field__input"
                      value={form.otp}
                      onChange={(event) => setForm((current) => ({ ...current, otp: event.target.value }))}
                      required
                    />
                  </label>
                  <button type="submit" className="auth-form__secondary" disabled={loading}>
                    {loading ? "Checking..." : "Verify OTP"}
                  </button>
                </div>
              </form>

              <p className="auth-card__switch">
                Need another OTP? <Link to="/forgot-password">Request again</Link>
              </p>
            </>
          ) : (
            <form className="auth-form" onSubmit={handleReset}>
              <AuthVisibilityField
                label="New password"
                hiddenType="password"
                visibleType="text"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required
                autoComplete="new-password"
              />

              <AuthVisibilityField
                label="Confirm password"
                hiddenType="password"
                visibleType="text"
                value={form.confirmPassword}
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                required
                autoComplete="new-password"
              />

              <button type="submit" disabled={loading}>
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}

          <Toast message={message} tone={messageTone} />
        </section>
      </section>
    </main>
  );
}

export default ResetPassword;
