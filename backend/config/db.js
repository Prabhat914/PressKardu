const mongoose = require("mongoose");

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/presskardu";
const RETRY_DELAY_MS = Number(process.env.MONGO_RETRY_DELAY_MS || 5000);

let isConnecting = false;
let retryTimer = null;

mongoose.set("bufferCommands", false);

const scheduleReconnect = () => {
  if (retryTimer) {
    return;
  }

  retryTimer = setTimeout(() => {
    retryTimer = null;
    connectDB().catch(() => {
      // Errors are already logged inside connectDB.
    });
  }, RETRY_DELAY_MS);
};

const connectDB = async () => {
  if (isConnecting || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  isConnecting = true;

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("Mongodb Connected");
    return mongoose.connection;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    scheduleReconnect();
    return null;
  } finally {
    isConnecting = false;
  }
};

mongoose.connection.on("disconnected", () => {
  console.error("MongoDB disconnected");
  scheduleReconnect();
});

module.exports = connectDB;
