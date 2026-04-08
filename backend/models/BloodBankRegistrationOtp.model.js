import mongoose from 'mongoose';

const BloodBankRegistrationOtpSchema = new mongoose.Schema(
  {
    verificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'locked', 'expired'],
      default: 'pending',
      index: true,
    },
    verifyAttemptsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    resendCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastOtpSentAt: {
      type: Date,
      default: Date.now,
    },
    registrationData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    clientMeta: {
      ip: { type: String, default: '' },
      userAgent: { type: String, default: '' },
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

BloodBankRegistrationOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('BloodBankRegistrationOtp', BloodBankRegistrationOtpSchema);
