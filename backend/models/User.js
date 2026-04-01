const mongoose = require("mongoose");

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

module.exports  = mongoose.model("User", userSchema);
