import mongoose from 'mongoose';

const AdminAuthStateSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  tokenVersion: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  passwordChangedAt: {
    type: Date,
    default: null,
  },
  loginAttempts: {
    type: Number,
    default: 0,
    min: 0,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  versionKey: false,
});

export default mongoose.model('AdminAuthState', AdminAuthStateSchema);
