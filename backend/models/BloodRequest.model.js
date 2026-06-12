import mongoose from "mongoose";
import {
  BLOOD_GROUPS,
  URGENCY_LEVELS,
} from "../validations/validation.constants.js";

const BloodRequestSchema = new mongoose.Schema(
  {
    requestType: {
      type: String,
      enum: ["user", "bloodbank"],
      default: "user",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function requiredRequestedBy() {
        return this.requestType === "user";
      },
    },
    requestingBloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BloodBank",
    },
    targetBloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BloodBank",
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    bloodGroup: {
      type: String,
      enum: BLOOD_GROUPS,
      required: true,
    },
    units: {
      type: Number,
      required: true,
      min: 1,
    },
    urgency: {
      type: String,
      enum: URGENCY_LEVELS,
      default: "normal",
    },
    hospital: {
      name: String,
      address: String,
      location: {
        type: {
          type: String,
          enum: ["Point"],
        },
        coordinates: {
          type: [Number],
        },
      },
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value) =>
          /^[0-9]{10}$/.test(String(value).replace(/\D/g, "")),
        message: "Contact number must be 10 digits",
      },
    },
    requiredBy: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days from now
    },
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "in_progress",
        "fulfilled",
        "completed",
        "rejected",
        "cancelled",
      ],
      default: "pending",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    fulfillment: {
      fulfilledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BloodBank",
      },
      fulfilledAt: Date,
      unitsProvided: Number,
      deliveryMethod: {
        type: String,
        enum: ["pickup", "delivery"],
      },
      notes: String,
    },
    timeline: [
      {
        status: {
          type: String,
          required: true,
        },
        updatedBy: mongoose.Schema.Types.ObjectId,
        updatedByModel: {
          type: String,
          enum: ["User", "BloodBank"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        note: String,
      },
    ],
    bloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BloodBank",
    },
    bloodBankResponse: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
      },
      respondedAt: Date,
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BloodBank",
      },
      responseNote: String,
    },
  },
  {
    timestamps: true,
  },
);

// Automatically add initial "pending" timeline entry on creation and clean up location
BloodRequestSchema.pre("save", async function () {
  if (this.isNew && (!this.timeline || this.timeline.length === 0)) {
    this.timeline.push({
      status: "pending",
      updatedBy: this.requestedBy || this.requestingBloodBank,
      updatedByModel: this.requestType === "user" ? "User" : "BloodBank",
      timestamp: new Date(),
      note: "Blood request created.",
    });
  }

  // Clean up location if coordinates are missing or invalid
  if (this.hospital?.location) {
    const coords = this.hospital.location.coordinates;
    if (coords && Array.isArray(coords) && coords.length === 2 && coords.every(c => c != null && !isNaN(c))) {
      this.hospital.location.type = "Point";
    } else {
      this.hospital.location = undefined;
    }
  }
});

// Indexes for efficient queries
BloodRequestSchema.index({ "hospital.location": "2dsphere" }); // Crucial for location-based matching
BloodRequestSchema.index({ status: 1, requestType: 1, createdAt: -1 });
BloodRequestSchema.index({ bloodBank: 1, status: 1 });
BloodRequestSchema.index({ targetBloodBank: 1, status: 1 });
BloodRequestSchema.index({ requestingBloodBank: 1, status: 1 });
BloodRequestSchema.index({ requestedBy: 1, requestType: 1, createdAt: -1 });
BloodRequestSchema.index({ createdAt: -1 });

BloodRequestSchema.index(
  { bloodGroup: 1, urgency: 1, createdAt: -1 },
  { partialFilterExpression: { status: "pending" } },
);

// Optimization: Compound index for blood bank history/updates
BloodRequestSchema.index({ bloodBank: 1, updatedAt: -1 });

export default mongoose.model("BloodRequest", BloodRequestSchema);
