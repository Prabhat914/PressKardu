const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const {
  getDeliveryDashboard,
  updateAvailability,
  updateCurrentLocation,
  claimDeliveryOrder,
  updateDeliveryOrderStatus
} = require("../controllers/deliveryController");

const router = express.Router();
router.use(authMiddleware, requireRole("delivery_partner"));
router.get("/dashboard", getDeliveryDashboard);
router.put("/availability", updateAvailability);
router.put("/location", updateCurrentLocation);
router.post("/orders/:id/claim", claimDeliveryOrder);
router.put("/orders/:id/status", updateDeliveryOrderStatus);

module.exports = router;
