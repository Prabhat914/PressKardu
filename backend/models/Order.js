const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    user : {
        type :  mongoose.Schema.Types.ObjectId,
        ref : "User",
        required: true
    },

    pressShop : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "PressShop",
        required: true
    },
    pickupAddress: {
        type: String,
        required: true,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    },
    clothesCount : {
        type: Number,
        required: true,
        min: 1
    },
    clothType: {
        type: String,
        trim: true
    },
    serviceType: {
        type: String,
        trim: true
    },
    pickupDate: {
        type: String,
        trim: true
    },
    pickupTime: {
        type: String,
        trim: true
    },
    deliveryDate: {
        type: String,
        trim: true
    },
    deliveryTime: {
        type: String,
        trim: true
    },
    totalPrice : {
        type: Number,
        required: true,
        min: 0
    },
    paymentMode: {
        type: String,
        enum: ["online", "offline"],
        default: "offline"
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid"],
        default: "pending"
    },
    paymentMethod: {
        type: String,
        trim: true,
        default: "cash"
    },
    couponCode: {
        type: String,
        trim: true
    },
    paymentVerification: {
        gatewayOrderId: {
            type: String,
            trim: true
        },
        gatewayPaymentId: {
            type: String,
            trim: true
        },
        signature: {
            type: String,
            trim: true
        },
        verifiedAt: Date
    },
    payoutStatus: {
        type: String,
        enum: ["pending", "not_applicable", "settled"],
        default: "not_applicable"
    },
    subscriptionPlanSnapshot: {
        type: String,
        enum: ["basic", "pro", "premium"],
        default: "basic"
    },
    pricing: {
        subtotal: {
            type: Number,
            default: 0
        },
        discount: {
            type: Number,
            default: 0
        },
        codFee: {
            type: Number,
            default: 0
        },
        platformFee: {
            type: Number,
            default: 0
        },
        shopEarning: {
            type: Number,
            default: 0
        },
        commissionRate: {
            type: Number,
            default: 0
        }
    },
    customerBenefits: {
        appliedCouponCode: {
            type: String,
            trim: true
        },
        loyaltyPointsEarned: {
            type: Number,
            default: 0
        },
        repeatCustomer: {
            type: Boolean,
            default: false
        },
        prepaidPrioritySupport: {
            type: Boolean,
            default: false
        },
        orderProtection: {
            type: Boolean,
            default: false
        }
    },
    status : {
        type : String,
        enum : ["pending", "accepted", "picked_up", "pressed", "delivered", "completed", "cancelled", "rejected", "reschedule_requested"],
        default : "pending"
    },
    acceptedAt: Date,
    autoCancelAt: Date,
    autoCancelledReason: {
        type: String,
        trim: true
    },
    rescheduleRequest: {
        requestedBy: {
            type: String,
            enum: ["user", "presswala", "admin"]
        },
        reason: {
            type: String,
            trim: true
        },
        requestedPickupDate: {
            type: String,
            trim: true
        },
        requestedPickupTime: {
            type: String,
            trim: true
        },
        requestedDeliveryDate: {
            type: String,
            trim: true
        },
        requestedDeliveryTime: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        resolvedAt: Date
    },
    liveTracking: {
        currentLocation: {
            lat: Number,
            lng: Number,
            updatedAt: Date,
            updatedBy: {
                type: String,
                enum: ["presswala", "admin"]
            }
        },
        history: {
            type: [
                {
                    lat: Number,
                    lng: Number,
                    updatedAt: {
                        type: Date,
                        default: Date.now
                    }
                }
            ],
            default: []
        }
    },
    timeline: {
        type: [
            {
                status: {
                    type: String,
                    required: true
                },
                label: {
                    type: String,
                    trim: true
                },
                happenedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ],
        default: [{ status: "pending", label: "Order placed" }]
    }
}, { timestamps: true});

module.exports = mongoose.model("Order", orderSchema);
