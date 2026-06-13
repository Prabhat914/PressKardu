import { useState } from "react";
import API from "../services/api";
import { Link, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../utils/apiError";
import { enableGuestDemo, saveSession } from "../utils/session";
import Toast from "../components/Toast";
import AuthVisibilityField from "../components/AuthVisibilityField";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password:""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const completeLogin = (data) => {
    saveSession({ token: data.token, user: data.user });
    navigate(
      data.user.role === "admin"
        ? "/admin"
        : data.user.role === "presswala"
        ? "/shops"
        : "/"
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await API.post("/auth/login", form);

      completeLogin(res.data);

    } catch (error) {
      console.log(error);
      setMessage(getApiErrorMessage(error, "Login complete nahi ho paaya. Dobara try karo."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page auth-page--simple">
      <section className="auth-shell auth-shell--simple auth-shell--visible">
        <section className="auth-card auth-card--wide">
          <div className="auth-card__halo" aria-hidden="true" />
          <p className="auth-card__eyebrow">Welcome back</p>
          <h2>Login to PressKardu</h2>
          <p className="auth-card__copy">
            Continue with your email and password.
          </p>
          <Toast message={message} tone="warning" inline />
          <p className="auth-card__message">
            Platform admin bhi isi login page se sign in karega. Admin account public signup se create nahi hota.
          </p>

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
