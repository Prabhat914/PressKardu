const mongoose = require("mongoose");

const pressShopSchema = new mongoose.Schema({
  ownerUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  shopName: {
    type: String,
    required: true,
    trim: true
  },
  ownerName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  phoneVerifiedAt: Date,
  subscriptionPlan: {
    type: String,
    enum: ["basic", "pro", "premium"],
    default: "basic"
  },
  subscriptionStatus: {
    type: String,
    enum: ["active", "pending", "inactive", "expired"],
    default: "active"
  },
  subscriptionPaymentMode: {
    type: String,
    enum: ["free", "online", "offline"],
    default: "free"
  },
  subscriptionAmount: {
    type: Number,
    default: 0
  },
  subscriptionStartedAt: Date,
  subscriptionExpiresAt: Date,
  pendingSubscription: {
    planId: {
      type: String,
      enum: ["basic", "pro", "premium"]
    },
    paymentMode: {
      type: String,
      enum: ["online", "offline"]
    },
    amount: Number,
    requestedAt: Date,
    gatewayOrderId: String
  },
  subscriptionHistory: {
    type: [
      {
        planId: {
          type: String,
          enum: ["basic", "pro", "premium"]
        },
        status: {
          type: String,
          trim: true
        },
        paymentMode: {
          type: String,
          enum: ["free", "online", "offline"]
        },
        amount: Number,
        notes: {
          type: String,
          trim: true
        },
        actor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    default: []
  },
  shopPhotoDataUrl: {
    type: String,
    trim: true
  },
  shopPhotoReviewed: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    index: true
  },
  verificationNotes: {
    type: String,
    trim: true
  },
  verificationSubmittedAt: {
    type: Date,
    default: Date.now
  },
  verificationReviewedAt: Date,
  verificationReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  verificationHistory: {
    type: [
      {
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"]
        },
        notes: {
          type: String,
          trim: true
        },
        source: {
          type: String,
          trim: true
        },
        actor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    default: []
  },
  reportCount: {
    type: Number,
    default: 0
  },
  reports: {
    type: [
      {
        reason: {
          type: String,
          trim: true
        },
        reporterName: {
          type: String,
          trim: true
        },
        reporterContact: {
          type: String,
          trim: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    default: []
  },
  fraudSignals: {
    type: [String],
    default: []
  },
  address: {
    type: String,
    required: true,
    trim: true
  },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },

    coordinates: {
      type: [Number],   // [longitude, latitude]
      required: true
    }
  },

  pricePerCloth: Number,
  serviceRadiusKm: {
    type: Number,
    default: 5
  },
  specialty: {
    type: String,
    trim: true
  },
  eta: {
    type: String,
    trim: true
  },
  pickupWindow: {
    type: String,
    trim: true
  },
  services: {
    type: [String],
    default: []
  },
  tags: {
    type: [String],
    default: []
  },
  about: {
    type: String,
    trim: true
  },
  turnaroundHours: {
    type: Number,
    default: 24
  },
  minimumOrderValue: {
    type: Number,
    default: 0
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  reviews: {
    type: [
      {
        authorName: {
          type: String,
          trim: true
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
          default: 5
        },
        comment: {
          type: String,
          trim: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    default: []
  },
  rating: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

pressShopSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("PressShop", pressShopSchema);
