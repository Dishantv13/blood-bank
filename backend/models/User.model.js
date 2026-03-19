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
    required: true
  },
  phone: {
    type: String,
    required: false
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
    type: String
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
      default: [0, 0]
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
  donorInfo: {
    weight: Number,
    height: Number,
    dateOfBirth: Date,
    gender: String,
    lastDonationDate: Date,
    donationCount: { type: Number, default: 0 },
    totalDonations: { type: Number, default: 0 },
    totalDonatedVolume: { type: Number, default: 0 },
    bloodPressure: String,
    hemoglobinLevel: Number,
    diseases: {
      hiv: Boolean,
      hepatitisB: Boolean,
      hepatitisC: Boolean,
      malaria: Boolean,
      tuberculosis: Boolean,
      heartDisease: Boolean,
      diabetes: Boolean,
      cancer: Boolean,
      bloodDisorder: Boolean,
      epilepsy: Boolean,
      asthma: Boolean,
      kidneyDisease: Boolean,
      liverDisease: Boolean
    },
    recentConditions: {
      fever: Boolean,
      coldOrFlu: Boolean,
      antibiotics: Boolean,
      surgery: Boolean,
      tattooOrPiercing: Boolean,
      pregnancy: Boolean,
      vaccination: Boolean
    },
    lifestyle: {
      alcohol: String,
      smoking: String,
      drugUse: Boolean
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String
    },
    consent: Boolean,
    accuracyDeclaration: Boolean,
    isEligible: Boolean,
    eligibilityReasons: Object,
    lastUpdated: Date
  },
  passwordReset: {
    token: String,
    expiresAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
UserSchema.index({ location: '2dsphere' });

export default mongoose.model('User', UserSchema);
