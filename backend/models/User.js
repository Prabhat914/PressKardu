const mongoose = require("mongoose");
const { getAdminEmail } = require("../config/runtime");

const userSchema = new mongoose.Schema({
    name : {
        type : String,
        required : true
    },
    email : {
        type : String,
         required : true,
         unique : true,
    },
    phone : String,
     
    password : {
        type : String,
        required : true
    },
    role : {
        type : String,
        enum : ["user", "presswala", "admin"],
        default : "user"
    },
    passwordReset: {
        otpHash: {
            type: String
        },
        otpExpiresAt: Date,
        otpChannel: {
            type: String,
            enum: ["email", "sms"]
        },
        otpTarget: String,
        otpAttempts: {
            type: Number,
            default: 0
        },
        resetTokenHash: String,
        resetTokenExpiresAt: Date,
        lastSentAt: Date,
        verifiedAt: Date
    }
}, {timestamps : true});

userSchema.pre("validate", function normalizeAndValidateAdminRole(next) {
    if (this.email) {
        this.email = String(this.email).trim().toLowerCase();
    }

    if (this.role !== "admin") {
        return next();
    }

    const reservedAdminEmail = getAdminEmail();

    if (!reservedAdminEmail || this.email !== reservedAdminEmail) {
        return next(new Error("Only the configured ADMIN_EMAIL account can hold the admin role."));
    }

    next();
});

module.exports  = mongoose.model("User", userSchema);
