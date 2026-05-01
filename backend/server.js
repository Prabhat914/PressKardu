require("dotenv").config(); 
const fs = require("fs");
const path = require("path");
const app = require("./app");
const connectDB = require("./config/db");
const { validateProductionConfig } = require("./config/runtime");
const bootstrapAdmin = require("./services/bootstrapAdmin");

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "127.0.0.1";
const logFile = path.join(__dirname, "server.err.log");

const appendErrorLog = (error) => {
  const message = `[${new Date().toISOString()}] ${error?.stack || error}\n`;
  fs.appendFileSync(logFile, message);
};

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  appendErrorLog(error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  appendErrorLog(error);
});

const startServer = async () => {
  try {
    validateProductionConfig();
    await connectDB();
    await bootstrapAdmin();

    app.listen(PORT, HOST, () => {
      console.log(`server running on http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    appendErrorLog(error);
    process.exit(1);
  }
};

startServer();
