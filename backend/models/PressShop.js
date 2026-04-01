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
