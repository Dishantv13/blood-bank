import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      refPath: "actorModel",
    },
    actorModel: {
      type: String,
      required: true,
      enum: ["User", "BloodBank", "Admin"],
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "targetModel",
    },
    targetModel: {
      type: String,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 15 * 24 * 60 * 60, // Automatically delete logs older than 15 days
    },
  },
  {
    timestamps: false,
  },
);

// Index for filtering by actor
AuditLogSchema.index({ actor: 1, action: 1, timestamp: -1 });
// Index for filtering by target
AuditLogSchema.index({ target: 1, timestamp: -1 });

export default mongoose.model("AuditLog", AuditLogSchema);
