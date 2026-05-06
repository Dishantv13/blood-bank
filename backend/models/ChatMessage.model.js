import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BloodRequest",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "senderModel",
      required: true,
    },
    senderModel: {
      type: String,
      required: true,
      enum: ["User", "BloodBank"],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "recipientModel",
      required: true,
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ["User", "BloodBank"],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for fast retrieval of chat history for a specific request
ChatMessageSchema.index({ requestId: 1, createdAt: 1 });

// Index for unread message counts
ChatMessageSchema.index({ recipient: 1, isRead: 1 });

export default mongoose.model("ChatMessage", ChatMessageSchema);
