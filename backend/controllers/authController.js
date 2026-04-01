const User = require("../models/User");
const PressShop = require("../models/PressShop");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateOtp, generateResetToken, hashValue } = require("../utils/otp");
const { deliverResetOtp } = require("../utils/otpDelivery");

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
const RESET_TOKEN_EXPIRY_MINUTES = Number(process.env.RESET_TOKEN_EXPIRY_MINUTES || 15);
const MAX_OTP_ATTEMPTS = Number(process.env.MAX_OTP_ATTEMPTS || 5);
const SHOULD_EXPOSE_DEBUG_OTP =
    process.env.NODE_ENV !== "production" && process.env.ALLOW_DEBUG_OTP === "true";

const buildAuthResponse = async (user) => {
    const safeUser = {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
    };

    const pressShop = user.role === "presswala"
        ? await PressShop.findOne({ ownerUser: user._id })
        : null;

    return {
        user: safeUser,
        pressShop
    };
};

exports.login = async (req, res) =>{
    const {email, password} = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if(!user){
        return res.status(404).json({message: "User not found"});
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if(!isMatch){
        return res.status(400).json({ message: "Invalid password"});
    }

    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || "secretKey",
        { expiresIn : "7d" }
    );

    const payload = await buildAuthResponse(user);

    res.json({
        token,
        ...payload
    });
};

exports.signup = async (req, res)=>{
    const {
        name,
        email,
        password,
        phone,
        role: incomingRole = "user",
        shopName,
        address,
        latitude,
        longitude,
        pricePerCloth,
        serviceRadiusKm
    } = req.body;

    const role = incomingRole === "presswala" ? "presswala" : "user";

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
    }

    if (role === "presswala") {
        if (!shopName || !address || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                message: "Shop name, address, latitude and longitude are required for shopkeepers"
            });
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        name,
        email: normalizedEmail,
        phone,
        role,
        password : hashedPassword
    });

    let pressShop = null;

    if (role === "presswala") {
        pressShop = await PressShop.create({
            ownerUser: user._id,
            shopName,
            ownerName: name,
            phone,
            address,
            location: {
                type: "Point",
                coordinates: [Number(longitude), Number(latitude)]
            },
            pricePerCloth: pricePerCloth ? Number(pricePerCloth) : undefined,
            serviceRadiusKm: serviceRadiusKm ? Number(serviceRadiusKm) : undefined,
            specialty: req.body.specialty,
            eta: req.body.eta,
            pickupWindow: req.body.pickupWindow,
            services: Array.isArray(req.body.services) ? req.body.services : [],
            about: req.body.about
        });
    }

    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || "secretKey",
        { expiresIn : "7d" }
    );

    res.status(201).json({
        token,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role
        },
        pressShop
    });
};

exports.forgotPassword = async (req, res) => {
    const { email, channel = "email" } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        return res.json({
            message: "If this account exists, an OTP has been sent."
        });
    }

    if (channel === "sms" && !user.phone) {
        return res.status(400).json({
            message: "This account does not have a phone number for SMS OTP."
        });
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const otpTarget = channel === "sms" ? user.phone : user.email;

    user.passwordReset = {
        otpHash: hashValue(otp),
        otpExpiresAt,
        otpChannel: channel,
        otpTarget,
        otpAttempts: 0,
        resetTokenHash: undefined,
        resetTokenExpiresAt: undefined,
        lastSentAt: new Date(),
        verifiedAt: undefined
    };

    await user.save();

    const delivery = await deliverResetOtp({
        channel,
        email: user.email,
        phone: user.phone,
        otp
    });

    res.json({
        message: "If this account exists, an OTP has been sent.",
        delivery,
        deliveryHint: delivery.provider === "console-fallback"
            ? "No email/SMS provider is configured yet, so the OTP is available in backend logs."
            : `OTP sent via ${delivery.provider}.`,
        ...(SHOULD_EXPOSE_DEBUG_OTP ? { debugOtp: otp } : {})
    });
};

exports.verifyResetOtp = async (req, res) => {
    const { email, otp } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.passwordReset?.otpHash || !user.passwordReset?.otpExpiresAt) {
        return res.status(400).json({ message: "OTP session not found. Request a new OTP." });
    }

    if (user.passwordReset.otpAttempts >= MAX_OTP_ATTEMPTS) {
        return res.status(429).json({ message: "Too many invalid OTP attempts. Request a new OTP." });
    }

    if (new Date(user.passwordReset.otpExpiresAt) < new Date()) {
        return res.status(400).json({ message: "OTP has expired. Request a new OTP." });
    }

    if (hashValue(otp) !== user.passwordReset.otpHash) {
        user.passwordReset.otpAttempts = (user.passwordReset.otpAttempts || 0) + 1;
        await user.save();
        return res.status(400).json({ message: "Invalid OTP." });
    }

    const resetToken = generateResetToken();

    user.passwordReset.resetTokenHash = hashValue(resetToken);
    user.passwordReset.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    user.passwordReset.verifiedAt = new Date();
    user.passwordReset.otpAttempts = 0;

    await user.save();

    res.json({
        message: "OTP verified successfully.",
        resetToken
    });
};

exports.resetPassword = async (req, res) => {
    const { email, resetToken, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.passwordReset?.resetTokenHash || !user.passwordReset?.resetTokenExpiresAt) {
        return res.status(400).json({ message: "Password reset session not found." });
    }

    if (new Date(user.passwordReset.resetTokenExpiresAt) < new Date()) {
        return res.status(400).json({ message: "Reset session expired. Verify OTP again." });
    }

    if (hashValue(resetToken) !== user.passwordReset.resetTokenHash) {
        return res.status(400).json({ message: "Invalid reset token." });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordReset = undefined;

    await user.save();

    res.json({
        message: "Password reset successful. You can now login with the new password."
    });
};
