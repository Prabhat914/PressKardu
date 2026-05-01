const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const pressRoutes = require("./routes/pressRoutes");
const orderRoutes = require("./routes/orderRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");
const { createRateLimiter } = require("./middleware/rateLimit");
const { getOtpDeliveryStatus } = require("./utils/otpDelivery");
const { isProduction, isTrustedOrigin } = require("./config/runtime");

const app = express();
const authRateLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    limit: 25,
    message: "Too many authentication attempts. Please try again later."
});

const passwordResetRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message: "Too many password reset attempts. Please try again later."
});

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(self), camera=(), microphone=()");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");

    if (isProduction) {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    next();
});

app.use(cors({
    origin(origin, callback) {
        if (isTrustedOrigin(origin)) {
            return callback(null, true);
        }

        return callback(new Error("CORS origin not allowed"));
    },
    credentials: true
}));
app.use(express.json({ limit: "8mb" }));

app.use(morgan("dev"));
app.use("/api/auth/login", authRateLimiter);
app.use("/api/auth/signup", authRateLimiter);
app.use("/api/auth/phone-verification", authRateLimiter);
app.use("/api/auth/forgot-password", passwordResetRateLimiter);
app.use("/api/auth/verify-reset-otp", passwordResetRateLimiter);
app.use("/api/auth/reset-password", passwordResetRateLimiter);
app.get("/api/health", (req, res) => {
    res.json({
        status: mongoose.connection.readyState === 1 ? "ok" : "degraded",
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        otpProviders: getOtpDeliveryStatus()
    });
});

app.use("/api", (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            message: "Database unavailable. Backend is retrying MongoDB connection."
        });
    }

    return next();
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/press", pressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use(errorMiddleware);
app.get("/", (req,res)=>{
    res.send("Presskrdu backend Running");
});

module.exports =app;
