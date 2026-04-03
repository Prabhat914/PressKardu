const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");

const authMiddleware = require("../middleware/authMiddleware");
const { getProfile, updateProfile, updateSubscription, verifySubscriptionPayment } = require("../controllers/userController");

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (errors.isEmpty()) {
        return next();
    }

    return res.status(400).json({
        message: errors.array()[0].msg
    });
};

router.get("/profile", authMiddleware, getProfile);
router.put("/profile",
    authMiddleware,
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("phone").optional({ values: "falsy" }).trim().isLength({ min: 10, max: 15 }).withMessage("Phone must be between 10 and 15 digits"),
    body("shopName").optional().trim().notEmpty().withMessage("Shop name cannot be empty"),
    body("address").optional().trim().notEmpty().withMessage("Address cannot be empty"),
    body("pricePerCloth").optional({ values: "falsy" }).isFloat({ min: 0 }).withMessage("Price per cloth must be valid"),
    body("serviceRadiusKm").optional({ values: "falsy" }).isFloat({ min: 1 }).withMessage("Service radius must be valid"),
    body("latitude").optional({ values: "falsy" }).isFloat({ min: -90, max: 90 }).withMessage("Latitude must be valid"),
    body("longitude").optional({ values: "falsy" }).isFloat({ min: -180, max: 180 }).withMessage("Longitude must be valid"),
    validateRequest,
    updateProfile);
router.put("/subscription",
    authMiddleware,
    body("planId").isIn(["basic", "pro", "premium"]).withMessage("Valid subscription plan is required"),
    body("paymentMode").optional().isIn(["free", "online", "offline"]).withMessage("Valid subscription payment mode is required"),
    validateRequest,
    updateSubscription);
router.post("/subscription/verify-payment",
    authMiddleware,
    body("gatewayOrderId").trim().notEmpty().withMessage("Gateway order id is required"),
    body("gatewayPaymentId").trim().notEmpty().withMessage("Gateway payment id is required"),
    body("signature").trim().notEmpty().withMessage("Signature is required"),
    validateRequest,
    verifySubscriptionPayment);

module.exports = router;
