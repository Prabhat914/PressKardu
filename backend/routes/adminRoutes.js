const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/requireRole");
const { body, validationResult } = require("express-validator");
const { getAdminOverview, getAdminShops, reviewAdminShop, approveOfflineSubscription } = require("../controllers/adminController");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    message: errors.array()[0].msg
  });
};

router.get("/overview", authMiddleware, requireRole("admin"), getAdminOverview);
router.get("/shops", authMiddleware, requireRole("admin"), getAdminShops);
router.patch("/shops/:id/review",
  authMiddleware,
  requireRole("admin"),
  body("verificationStatus").isIn(["approved", "rejected", "pending"]).withMessage("Verification status is invalid"),
  body("verificationNotes").optional({ values: "falsy" }).trim().isLength({ max: 300 }).withMessage("Verification note is too long"),
  validateRequest,
  reviewAdminShop);
router.patch("/shops/:id/subscription/approve",
  authMiddleware,
  requireRole("admin"),
  approveOfflineSubscription);

module.exports = router;
