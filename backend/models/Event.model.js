import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    organizer: {
      type: String,
      required: true,
    },
    organizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "organizerModel",
    },
    organizerModel: {
      type: String,
      enum: ["User", "BloodBank"],
      default: "User",
    },
    eventType: {
      type: String,
      enum: ["blood-drive", "awareness", "donation-camp", "health-checkup"],
      default: "blood-drive",
    },
    location: {
      name: String,
      address: String,
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
        },
        coordinates: {
          type: [Number],
        },
      },
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    contactInfo: {
      phone: String,
      email: String,
    },
    expectedDonors: {
      type: Number,
      default: 0,
    },
    registeredDonors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    visibility: {
      type: String,
      enum: ["public", "donors-only", "patients-only"],
      default: "public",
    },
    maxParticipants: {
      type: Number,
      default: 100,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
EventSchema.index({ organizedBy: 1, organizerModel: 1 });
EventSchema.index({ date: 1 });
EventSchema.index({ isActive: 1 });
EventSchema.index({ isActive: 1, date: 1 });
EventSchema.index({ registeredDonors: 1, date: 1 });
EventSchema.index({ "location.coordinates": "2dsphere" });

// Clean up location coordinates if they are missing or invalid to avoid 2dsphere indexing issues
EventSchema.pre("save", async function () {
  if (this.location?.coordinates) {
    const coords = this.location.coordinates.coordinates;
    if (coords && Array.isArray(coords) && coords.length === 2 && coords.every(c => c != null && !isNaN(c))) {
      this.location.coordinates.type = "Point";
    } else {
      this.location.coordinates = undefined;
    }
  }
});

export default mongoose.model("Event", EventSchema);
