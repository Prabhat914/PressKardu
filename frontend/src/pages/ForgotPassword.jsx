import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import Toast from "../components/Toast";

function ForgotPassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    channel: "email"
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await API.post("/auth/forgot-password", form);
      const debugText = res.data.debugOtp ? ` Test OTP: ${res.data.debugOtp}` : "";
      setMessage(`${res.data.message}${debugText}`);
      navigate("/reset-password", {
        state: {
          email: form.email
        }
      });
    } catch (error) {
      setMessage(getApiErrorMessage(error, "OTP send nahi ho paaya."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell auth-shell--visible">
        <section className="auth-card auth-card--wide">
          <p className="auth-card__eyebrow">Password recovery</p>
          <h2>Forgot password</h2>
          <p className="auth-card__copy">
            Email ya SMS OTP ke through password reset start karo.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span className="auth-field__label">Email</span>
              <input
                className="auth-field__input"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
                autoComplete="email"
              />
            </label>

            <label className="auth-field">
              <span className="auth-field__label">OTP channel</span>
              <select
                className="auth-field__input"
                value={form.channel}
                onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </label>

            <button type="submit" disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
          <Toast message={message} tone={message.includes("OTP") ? "success" : "warning"} />

          <p className="auth-card__switch">
            Back to <Link to="/login">Login</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default ForgotPassword;
