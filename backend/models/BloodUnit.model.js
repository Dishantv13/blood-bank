import mongoose from "mongoose";

const BloodUnitSchema = new mongoose.Schema(
  {
    unitId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: true,
      index: true,
    },
    donation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donation",
      required: true,
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BloodBank",
      required: true,
      index: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },
    componentType: {
      type: String,
      enum: ["Whole Blood", "RBC", "Platelets", "Plasma", "Cryoprecipitate"],
      default: "Whole Blood",
    },
    volume: {
      type: Number, // in ml
      required: true,
    },
    status: {
      type: String,
      enum: [
        "raw",
        "quarantine",
        "available",
        "reserved",
        "used",
        "expired",
        "discarded",
        "processed",
      ],
      default: "raw",
      index: true,
    },
    collectionDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    screeningStatus: {
      type: String,
      enum: ["pending", "passed", "failed"],
      default: "pending",
      index: true,
    },
    screeningResults: {
      hiv: {
        type: String,
        enum: ["negative", "positive", "pending"],
        default: "pending",
      },
      hbv: {
        type: String,
        enum: ["negative", "positive", "pending"],
        default: "pending",
      },
      hcv: {
        type: String,
        enum: ["negative", "positive", "pending"],
        default: "pending",
      },
      syphilis: {
        type: String,
        enum: ["negative", "positive", "pending"],
        default: "pending",
      },
      malaria: {
        type: String,
        enum: ["negative", "positive", "pending"],
        default: "pending",
      },
      testedAt: Date,
      testedBy: String,
    },
    coldChain: [
      {
        temperature: Number,
        recordedAt: { type: Date, default: Date.now },
        recordedBy: String,
        location: String,
        remarks: String,
      },
    ],
    crossMatch: {
      isCompatible: Boolean,
      recipientRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BloodRequest",
      },
      matchedAt: Date,
      matchedBy: String,
    },
    discardDetails: {
      reason: String,
      discardedAt: Date,
      discardedBy: String,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for searching
BloodUnitSchema.index({ bloodBank: 1, bloodGroup: 1, status: 1 });
BloodUnitSchema.index({ bloodBank: 1, componentType: 1, status: 1 });
BloodUnitSchema.index({ expiryDate: 1, status: 1 });

export default mongoose.model("BloodUnit", BloodUnitSchema);
