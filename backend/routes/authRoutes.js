const express = require("express");
const router =  express.Router();
const { body, validationResult } = require("express-validator");
const { signup, login, forgotPassword, verifyResetOtp, resetPassword} = require("../controllers/authController");

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);

    if (errors.isEmpty()) {
        return next();
    }

    return res.status(400).json({
        message: errors.array()[0].msg
    });
};

router.post("/signup",
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6}).withMessage("Password must be at least 6 characters"),
    body("phone").optional({ values: "falsy" }).trim().isLength({ min: 10, max: 15 }).withMessage("Phone must be between 10 and 15 digits"),
    body("role").optional().isIn(["user", "presswala"]).withMessage("Invalid role"),
    validateRequest,
    signup);
router.post("/login",
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6}).withMessage("Password must be at least 6 characters"),
    validateRequest,
    login);
router.post("/forgot-password",
    body("email").isEmail().withMessage("Valid email is required"),
    body("channel").optional().isIn(["email", "sms"]).withMessage("Invalid OTP channel"),
    validateRequest,
    forgotPassword);
router.post("/verify-reset-otp",
    body("email").isEmail().withMessage("Valid email is required"),
    body("otp").trim().isLength({ min: 4, max: 8 }).withMessage("Valid OTP is required"),
    validateRequest,
    verifyResetOtp);
router.post("/reset-password",
    body("email").isEmail().withMessage("Valid email is required"),
    body("resetToken").trim().notEmpty().withMessage("Reset token is required"),
    body("password").isLength({ min: 6}).withMessage("Password must be at least 6 characters"),
    validateRequest,
    resetPassword);
module.exports = router;
