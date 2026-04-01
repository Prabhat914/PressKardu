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

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

function isAllowedOrigin(origin) {
    if (!origin || allowedOrigins.length === 0) {
        return true;
    }

    if (allowedOrigins.includes(origin)) {
        return true;
    }

    try {
        const { hostname } = new URL(origin);
        const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
        const isVercelPreview = hostname.endsWith(".vercel.app");

        return isLocalhost || isVercelPreview;
    } catch {
        return false;
    }
}

app.use(cors({
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }

        return callback(new Error("CORS origin not allowed"));
    },
    credentials: true
}));
app.use(express.json());

app.use(morgan("dev"));
app.get("/api/health", (req, res) => {
    res.json({
        status: mongoose.connection.readyState === 1 ? "ok" : "degraded",
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
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
