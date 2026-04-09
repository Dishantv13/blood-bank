import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  phone: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: (value) => !value || /^[0-9]{10}$/.test(String(value).replace(/\D/g, '')),
      message: 'Phone number must be 10 digits'
    }
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  photoURL: {
    type: String,
    trim: true
  },
  photoURLPublicId: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'donor', 'admin', 'bloodbank'],
    default: 'user'
  },
  isDonor: {
    type: Boolean,
    default: false
  },
  needsBlood: {
    type: Boolean,
    default: false
  },
  activeMode: {
    type: String,
    enum: ['donor', 'patient'],
    default: 'patient'
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
      validate: {
        validator: (coords) => Array.isArray(coords) && coords.length === 2 && coords.every((value) => Number.isFinite(value)),
        message: 'Location coordinates must contain valid longitude and latitude values'
      }
    }
  },
  aadharCard: {
    imageUrl: String,
    isVerified: {
      type: Boolean,
      default: false
    },
    uploadedAt: Date
  },
  lastDonationDate: {
    type: Date
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  healthForm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DonorHealth'
  },
  donorInfo: {
    // Summary statistics for fast dashboard/profile access
    totalDonations: { type: Number, default: 0 },
    totalDonatedVolume: { type: Number, default: 0 },
    lastDonationDate: Date,
    isEligible: { type: Boolean, default: false },
    eligibilityReasons: Object,
    lastUpdated: Date,
    
    // Core identity fields that might be needed frequently
    dateOfBirth: Date,
    gender: String,
    bloodGroup: String
  },
  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lockUntil: {
    type: Date,
    select: false
  },
  passwordReset: {
    token: { type: String, select: false },
    expiresAt: { type: Date, select: false }
  },
  tokenVersion: {
    type: Number,
    default: 0,
    min: 0,
    select: false
  },
  passwordChangedAt: {
    type: Date,
    default: null,
    select: false
  },
  authSession: {
    refreshTokenHash: {
      type: String,
      default: null,
      select: false
    },
    refreshTokenIssuedAt: {
      type: Date,
      default: null,
      select: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isFake: {
    type: Boolean,
    default: false
  }
});

// Index for geospatial queries
UserSchema.index({ location: '2dsphere' });
UserSchema.index({ phone: 1 });
UserSchema.index({ bloodGroup: 1, isAvailable: 1, isDonor: 1 });
UserSchema.index({ role: 1, createdAt: -1 });

export default mongoose.model('User', UserSchema);
