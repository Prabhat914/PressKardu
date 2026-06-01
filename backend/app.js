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
const { getPaymentProvider, supportsHostedSubscriptionPayments } = require("./services/paymentService");

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
app.use("/api/auth/email-verification", authRateLimiter);
app.use("/api/auth/phone-verification", authRateLimiter);
app.use("/api/auth/forgot-password", passwordResetRateLimiter);
app.use("/api/auth/verify-reset-otp", passwordResetRateLimiter);
app.use("/api/auth/reset-password", passwordResetRateLimiter);

function buildHealthPayload() {
    const databaseConnected = mongoose.connection.readyState === 1;
    const otpProviders = getOtpDeliveryStatus();
    const paymentProvider = getPaymentProvider();
    const hostedPaymentsReady = supportsHostedSubscriptionPayments();

    return {
        status: databaseConnected ? "ok" : "degraded",
        service: "presskardu-backend",
        environment: process.env.NODE_ENV || "development",
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        database: {
            state: mongoose.connection.readyState,
            connected: databaseConnected,
            name: mongoose.connection.name || ""
        },
        otpProviders,
        payments: {
            provider: paymentProvider,
            hostedCheckoutReady: hostedPaymentsReady,
            verificationConfigured: Boolean(process.env.PAYMENT_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET)
        },
        config: {
            corsConfigured: Boolean(String(process.env.CORS_ORIGIN || "").trim()),
            jwtConfigured: Boolean(String(process.env.JWT_SECRET || "").trim()),
            adminConfigured: Boolean(String(process.env.ADMIN_EMAIL || "").trim() && String(process.env.ADMIN_PASSWORD || "").trim()),
            production: isProduction
        },
        memory: {
            rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
        }
    };
}

app.get("/api/health", (req, res) => {
    const payload = buildHealthPayload();
    res.status(payload.database.connected ? 200 : 503).json(payload);
});

app.get("/api/ready", (req, res) => {
    const payload = buildHealthPayload();
    const smsReady = payload.otpProviders.sms.configured;
    const productionReady = payload.database.connected &&
        (!isProduction || (payload.config.corsConfigured && payload.config.jwtConfigured && smsReady));

    res.status(productionReady ? 200 : 503).json({
        ready: productionReady,
        blockers: [
            !payload.database.connected ? "database disconnected" : "",
            isProduction && !payload.config.corsConfigured ? "CORS_ORIGIN missing" : "",
            isProduction && !payload.config.jwtConfigured ? "JWT_SECRET missing" : "",
            isProduction && !smsReady ? "SMS OTP provider missing" : ""
        ].filter(Boolean),
        ...payload
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
