const express = require("express");
const router =  express.Router();
const { body, validationResult } = require("express-validator");
const {
    signup,
    login,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    sendEmailVerificationOtp,
    verifyEmailVerificationOtp,
    sendPhoneVerificationOtp,
    verifyPhoneVerificationOtp
} = require("../controllers/authController");

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
    body("password")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
        .matches(/[A-Za-z]/).withMessage("Password must include at least one letter")
        .matches(/\d/).withMessage("Password must include at least one number"),
    body("phone")
        .trim()
        .custom((value) => {
            const digits = String(value || "").replace(/\D/g, "");
            return digits.length >= 10 && digits.length <= 15;
        })
        .withMessage("Phone must be between 10 and 15 digits"),
    body("phoneOtpVerified").custom((value) => value === true || value === "true").withMessage("Phone OTP verification is required"),
    body("role").optional().isIn(["user", "presswala"]).withMessage("Invalid role"),
    validateRequest,
    signup);
router.post("/email-verification/send-otp",
    body("email").isEmail().withMessage("Valid email is required"),
    validateRequest,
    sendEmailVerificationOtp);
router.post("/email-verification/verify-otp",
    body("email").isEmail().withMessage("Valid email is required"),
    body("otp").trim().isLength({ min: 4, max: 8 }).withMessage("Valid OTP is required"),
    validateRequest,
    verifyEmailVerificationOtp);
router.post("/phone-verification/send-otp",
    body("phone")
        .trim()
        .custom((value) => {
            const digits = String(value || "").replace(/\D/g, "");
            return digits.length >= 10 && digits.length <= 15;
        })
        .withMessage("Phone must be between 10 and 15 digits"),
    validateRequest,
    sendPhoneVerificationOtp);
router.post("/phone-verification/verify-otp",
    body("phone")
        .trim()
        .custom((value) => {
            const digits = String(value || "").replace(/\D/g, "");
            return digits.length >= 10 && digits.length <= 15;
        })
        .withMessage("Phone must be between 10 and 15 digits"),
    body("otp").trim().isLength({ min: 4, max: 8 }).withMessage("Valid OTP is required"),
    validateRequest,
    verifyPhoneVerificationOtp);
router.post("/login",
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").trim().notEmpty().withMessage("Password is required"),
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
    body("password")
        .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
        .matches(/[A-Za-z]/).withMessage("Password must include at least one letter")
        .matches(/\d/).withMessage("Password must include at least one number"),
    validateRequest,
    resetPassword);
module.exports = router;
