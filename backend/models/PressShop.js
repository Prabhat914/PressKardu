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
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
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
  payoutDetails: {
    accountHolderName: {
      type: String,
      trim: true
    },
    upiId: {
      type: String,
      trim: true
    },
    bankName: {
      type: String,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    ifscCode: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    updatedAt: Date
  },
  shopLogoDataUrl: {
    type: String,
    trim: true
  },
  shopPhotosDataUrls: {
    type: [String],
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
  pincode: {
    type: String,
    trim: true
  },
  landmark: {
    type: String,
    trim: true
  },
  googleMapsUrl: {
    type: String,
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
  priceList: {
    type: [
      {
        cloth: {
          type: String,
          trim: true
        },
        price: {
          type: Number,
          default: 0
        }
      }
    ],
    default: []
  },
  serviceRadiusKm: {
    type: Number,
    default: 5
  },
  businessHours: {
    openingTime: {
      type: String,
      trim: true
    },
    closingTime: {
      type: String,
      trim: true
    },
    weeklyOff: {
      type: String,
      trim: true,
      default: "Sunday"
    },
    scheduleText: {
      type: String,
      trim: true
    },
    currentStatus: {
      type: String,
      enum: ["open", "closed"],
      default: "open"
    }
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
  pickupDelivery: {
    pickupAvailable: {
      type: Boolean,
      default: true
    },
    homeDelivery: {
      type: Boolean,
      default: true
    },
    pickupCharges: {
      type: Number,
      default: 0
    },
    deliveryCharges: {
      type: Number,
      default: 0
    },
    freeDeliveryAbove: {
      type: Number,
      default: 500
    }
  },
  capacity: {
    dailyOrderLimit: {
      type: Number,
      default: 60
    }
  },
  paymentMethods: {
    type: [String],
    default: ["Cash", "UPI"]
  },
  staffDetails: {
    employees: {
      type: Number,
      default: 0
    },
    deliveryPartners: {
      type: Number,
      default: 0
    }
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
pressShopSchema.index({ phone: 1 }, { sparse: true });
pressShopSchema.index({ verificationStatus: 1, rating: -1, createdAt: -1 });
pressShopSchema.index({ verificationStatus: 1, pricePerCloth: 1, rating: -1 });
pressShopSchema.index({ verificationStatus: 1, turnaroundHours: 1, rating: -1 });
pressShopSchema.index({ verificationStatus: 1, reportCount: -1, createdAt: -1 });
pressShopSchema.index({ subscriptionStatus: 1, subscriptionPlan: 1 });
pressShopSchema.index({ shopName: "text", address: "text", specialty: "text", services: "text" });

module.exports = mongoose.model("PressShop", pressShopSchema);
