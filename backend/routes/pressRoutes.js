const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/authMiddleware");

const {
  createPressShop,
  getPressShops,
  getNearbyPressShops,
  getPressShopById,
  reportPressShop
} = require("../controllers/pressController");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return res.status(400).json({
    message: errors.array()[0].msg
  });
};

router.post("/create",
  authMiddleware,
  body("shopName").trim().notEmpty().withMessage("Shop name is required"),
  body("address").trim().notEmpty().withMessage("Address is required"),
  body("latitude").isFloat({ min: -90, max: 90 }).withMessage("Valid latitude is required"),
  body("longitude").isFloat({ min: -180, max: 180 }).withMessage("Valid longitude is required"),
  body("pricePerCloth").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Price per cloth must be valid"),
  body("serviceRadiusKm").optional({ values: "falsy" }).isFloat({ min: 1 }).withMessage("Service radius must be valid"),
  validateRequest,
  createPressShop);
router.get("/", getPressShops);
router.get("/nearby", getNearbyPressShops);
router.post("/:id/report",
  body("reason").trim().isLength({ min: 10 }).withMessage("Report reason must be at least 10 characters"),
  body("reporterName").optional({ values: "falsy" }).trim().isLength({ max: 80 }).withMessage("Reporter name is too long"),
  body("reporterContact").optional({ values: "falsy" }).trim().isLength({ max: 120 }).withMessage("Reporter contact is too long"),
  validateRequest,
  reportPressShop);
router.get("/:id", getPressShopById);

module.exports = router;
