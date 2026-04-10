import mongoose from 'mongoose';

const AuthSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'bloodbank'],
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  bloodBankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodBank',
    default: null,
    index: true,
  },
  adminEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: null,
    index: true,
  },
  refreshTokenHash: {
    type: String,
    required: true,
    select: false,
  },
  tokenVersion: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  lastUsedAt: {
    type: Date,
    default: Date.now,
  },
  rotatedAt: {
    type: Date,
    default: null,
  },
  revokedAt: {
    type: Date,
    default: null,
    index: true,
  },
  revokeReason: {
    type: String,
    trim: true,
    default: '',
  },
  ip: {
    type: String,
    trim: true,
    default: '',
  },
  userAgent: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  versionKey: false,
});

AuthSessionSchema.index({ role: 1, userId: 1, revokedAt: 1 });
AuthSessionSchema.index({ role: 1, bloodBankId: 1, revokedAt: 1 });
AuthSessionSchema.index({ role: 1, adminEmail: 1, revokedAt: 1 });
// Automatically remove expired sessions from the collection
AuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AuthSession', AuthSessionSchema);
