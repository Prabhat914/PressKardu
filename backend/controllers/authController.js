const User = require("../models/User");
const PressShop = require("../models/PressShop");
const PhoneVerificationSession = require("../models/PhoneVerificationSession");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateOtp, generateResetToken, hashValue } = require("../utils/otp");
const { deliverOtp, deliverResetOtp } = require("../utils/otpDelivery");
const { PHONE_OTP_EXPIRY_MINUTES, getVerifiedPhoneSession, normalizePhone } = require("../utils/phoneVerification");
const { allowDebugOtpExposure, isProduction, getJwtSecret } = require("../config/runtime");

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
const RESET_TOKEN_EXPIRY_MINUTES = Number(process.env.RESET_TOKEN_EXPIRY_MINUTES || 15);
const MAX_OTP_ATTEMPTS = Number(process.env.MAX_OTP_ATTEMPTS || 5);
const SHOULD_EXPOSE_DEBUG_OTP = allowDebugOtpExposure();
const PHONE_OTP_COOLDOWN_SECONDS = Number(process.env.PHONE_OTP_COOLDOWN_SECONDS || 45);

function ensureOtpDeliveryAvailable(delivery, channel) {
    if (delivery?.provider === "console-fallback" && isProduction) {
        const error = new Error(`${channel.toUpperCase()} OTP delivery is not configured for production use.`);
        error.statusCode = 503;
        throw error;
    }
}

const assessFraudSignals = ({ address, latitude, longitude, phone, serviceRadiusKm }) => {
    const signals = [];
    const cleanedAddress = String(address || "").trim();
    const cleanedPhone = String(phone || "").replace(/\D/g, "");

    if (cleanedAddress.length < 12) {
        signals.push("Address is too short for manual verification");
    }

    if (!cleanedPhone || cleanedPhone.length < 10) {
        signals.push("Phone number is missing or incomplete");
    }

    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
        signals.push("Map coordinates are invalid");
    }

    if (serviceRadiusKm && Number(serviceRadiusKm) > 30) {
        signals.push("Service radius is unusually large");
    }

    return signals;
};

function isValidShopPhotoDataUrl(value) {
    return /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(String(value || ""));
}

exports.sendPhoneVerificationOtp = async (req, res) => {
    const normalizedPhone = normalizePhone(req.body.phone);

    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
        return res.status(400).json({ message: "Valid phone number is required" });
    }

    const existingSession = await PhoneVerificationSession.findOne({ phone: normalizedPhone });
    if (existingSession?.lastSentAt) {
        const secondsSinceLastSend = Math.floor((Date.now() - new Date(existingSession.lastSentAt).getTime()) / 1000);
        if (secondsSinceLastSend < PHONE_OTP_COOLDOWN_SECONDS) {
            return res.status(429).json({
                message: `Please wait ${PHONE_OTP_COOLDOWN_SECONDS - secondsSinceLastSend} seconds before requesting another OTP.`,
                retryAfterSeconds: PHONE_OTP_COOLDOWN_SECONDS - secondsSinceLastSend
            });
        }
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + PHONE_OTP_EXPIRY_MINUTES * 60 * 1000);

    await PhoneVerificationSession.findOneAndUpdate(
        { phone: normalizedPhone },
        {
            phone: normalizedPhone,
            otpHash: hashValue(otp),
            otpExpiresAt,
            verifiedAt: undefined,
            consumedAt: undefined,
            attempts: 0,
            lastSentAt: new Date(),
            purpose: "shop-signup"
        },
        {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
    );

    const delivery = await deliverOtp({
        channel: "sms",
        phone: normalizedPhone,
        otp,
        purpose: "phone verification"
    });
    ensureOtpDeliveryAvailable(delivery, "sms");

    res.json({
        message: "Phone verification OTP sent.",
        delivery,
        deliveryHint: `OTP sent via ${delivery.provider}.`,
        ...(SHOULD_EXPOSE_DEBUG_OTP ? { debugOtp: otp } : {})
    });
};

exports.verifyPhoneVerificationOtp = async (req, res) => {
    const normalizedPhone = normalizePhone(req.body.phone);
    const otp = String(req.body.otp || "").trim();
    const session = await PhoneVerificationSession.findOne({ phone: normalizedPhone });

    if (!session || !session.otpHash || !session.otpExpiresAt) {
        return res.status(400).json({ message: "OTP session not found. Request a new OTP." });
    }

    if (session.attempts >= MAX_OTP_ATTEMPTS) {
        return res.status(429).json({ message: "Too many invalid OTP attempts. Request a new OTP." });
    }

    if (session.consumedAt) {
        return res.status(400).json({ message: "OTP session already used. Request a new OTP." });
    }

    if (new Date(session.otpExpiresAt) < new Date()) {
        return res.status(400).json({ message: "OTP has expired. Request a new OTP." });
    }

    if (hashValue(otp) !== session.otpHash) {
        session.attempts = (session.attempts || 0) + 1;
        await session.save();
        return res.status(400).json({ message: "Invalid OTP." });
    }

    session.verifiedAt = new Date();
    session.attempts = 0;
    await session.save();

    res.json({
        message: "Phone number verified successfully.",
        phone: normalizedPhone,
        verifiedAt: session.verifiedAt
    });
};

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
        getJwtSecret(),
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
        if (!shopName || !address || latitude === undefined || longitude === undefined || !phone) {
            return res.status(400).json({
                message: "Shop name, phone, address, latitude and longitude are required for shopkeepers"
            });
        }

        if (!req.body.phoneOtpVerified) {
            return res.status(400).json({ message: "Phone OTP verification is required for shopkeepers" });
        }

        if (!req.body.shopPhotoDataUrl || !isValidShopPhotoDataUrl(req.body.shopPhotoDataUrl)) {
            return res.status(400).json({ message: "A valid shop photo is required for shopkeepers" });
        }
    }

    const normalizedPhone = role === "presswala" ? normalizePhone(phone) : normalizePhone(phone);
    const duplicatePhoneUser = normalizedPhone
        ? await User.findOne({ phone: normalizedPhone })
        : null;

    if (duplicatePhoneUser) {
        return res.status(400).json({ message: "Phone number is already linked to another account" });
    }

    if (role === "presswala") {
        const duplicateShopPhone = await PressShop.findOne({ phone: normalizedPhone });
        if (duplicateShopPhone) {
            return res.status(400).json({ message: "Phone number is already linked to another shop" });
        }

        const phoneVerification = await getVerifiedPhoneSession(normalizedPhone);

        if (!phoneVerification || phoneVerification.consumedAt) {
            return res.status(400).json({ message: "Phone verification expired or is missing. Verify again." });
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let user;
    let pressShop = null;

    try {
        user = await User.create({
            name,
            email: normalizedEmail,
            phone: normalizedPhone || undefined,
            role,
            password : hashedPassword
        });

        if (role === "presswala") {
            const phoneVerification = await getVerifiedPhoneSession(normalizedPhone);

            if (!phoneVerification || phoneVerification.consumedAt) {
                await User.deleteOne({ _id: user._id });
                return res.status(400).json({ message: "Phone verification expired or is missing. Verify again." });
            }

            const fraudSignals = assessFraudSignals({
                address,
                latitude,
                longitude,
                phone: normalizedPhone,
                serviceRadiusKm
            });

            pressShop = await PressShop.create({
                ownerUser: user._id,
                shopName,
                ownerName: name,
                phone: normalizedPhone,
                phoneVerifiedAt: phoneVerification.verifiedAt,
                shopPhotoDataUrl: req.body.shopPhotoDataUrl,
                verificationStatus: "pending",
                verificationSubmittedAt: new Date(),
                verificationHistory: [
                    {
                        status: "pending",
                        notes: "Shop submitted and awaiting admin verification.",
                        source: "signup",
                        createdAt: new Date()
                    }
                ],
                fraudSignals,
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

            phoneVerification.consumedAt = new Date();
            await phoneVerification.save();
        }
    } catch (error) {
        if (user?._id && role === "presswala" && !pressShop) {
            await User.deleteOne({ _id: user._id });
        }
        throw error;
    }

    const token = jwt.sign(
        { id: user._id, role: user.role },
        getJwtSecret(),
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
        pressShop,
        message: role === "presswala"
            ? "Account created. Your shop is pending admin verification before it appears publicly."
            : "Account created successfully."
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
    ensureOtpDeliveryAvailable(delivery, channel);

    res.json({
        message: "If this account exists, an OTP has been sent.",
        delivery,
        deliveryHint: `OTP sent via ${delivery.provider}.`,
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
