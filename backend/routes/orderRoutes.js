const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createOrder,
  getMyOrders,
  getShopOrders,
  updateOrderStatus,
  verifyPaymentSignature,
  requestReschedule,
  resolveReschedule,
  updateLiveTracking
} = require("../controllers/orderController");

router.post("/", authMiddleware, createOrder);
router.get("/my", authMiddleware, getMyOrders);
router.get("/shop", authMiddleware, getShopOrders);
router.put("/:id/status", authMiddleware, updateOrderStatus);
router.post("/:id/verify-payment", authMiddleware, verifyPaymentSignature);
router.post("/:id/reschedule", authMiddleware, requestReschedule);
router.put("/:id/reschedule", authMiddleware, resolveReschedule);
router.put("/:id/tracking", authMiddleware, updateLiveTracking);

module.exports = router;
