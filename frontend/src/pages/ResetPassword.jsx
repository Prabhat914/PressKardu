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
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyOtp = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await API.post("/auth/verify-reset-otp", {
        email: form.email,
        otp: form.otp
      });
      setResetToken(res.data.resetToken);
      setMessage("OTP verified. Ab naya password set karo.");
    } catch (error) {
      setMessage(getApiErrorMessage(error, "OTP verify nahi ho paaya."));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      setMessage("Password aur confirm password same hone chahiye.");
      return;
    }

    if (!resetToken) {
      setMessage("Pehle OTP verify karo.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await API.post("/auth/reset-password", {
        email: form.email,
        resetToken,
        password: form.password
      });
      setMessage(res.data.message);
      window.setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Password reset nahi ho paaya."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell auth-shell--visible">
        <section className="auth-card auth-card--wide">
          <p className="auth-card__eyebrow">Reset access</p>
          <h2>Verify OTP and reset password</h2>
          <p className="auth-card__copy">
            OTP verify karne ke baad hi backend new password accept karega.
          </p>

          <form className="auth-form" onSubmit={handleReset}>
            <AuthVisibilityField
              label="Email"
              hiddenType="password"
              visibleType="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
              autoComplete="email"
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
              <button type="button" className="auth-form__secondary" onClick={verifyOtp} disabled={loading}>
                {loading ? "Checking..." : "Verify OTP"}
              </button>
            </div>

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
          <Toast message={message} tone={message.toLowerCase().includes("successful") || message.toLowerCase().includes("verified") ? "success" : "warning"} />

          <p className="auth-card__switch">
            Need another OTP? <Link to="/forgot-password">Request again</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default ResetPassword;
