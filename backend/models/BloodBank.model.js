import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const BloodBankSchema = new mongoose.Schema({
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
    minlength: 12,
    select: false
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => /^[0-9]{10}$/.test(String(value).replace(/\D/g, '')),
      message: 'Phone number must be 10 digits'
    }
  },
  logo: {
    type: String,
    default: '',
    trim: true
  },
  imageUrl: {
    type: String,
    default: '',
    trim: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  registrationNumber: {
    type: String
  },
  establishedYear: {
    type: Number
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  profileImage: {
    type: String,
    default: '',
    trim: true
  },
  profileImagePublicId: {
    type: String,
    default: '',
    trim: true
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
  inventory: [{
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: true
    },
    units: {
      type: Number,
      default: 0,
      min: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  operatingHours: {
    open: {
      type: String,
      default: '09:00'
    },
    close: {
      type: String,
      default: '18:00'
    },
    days: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }]
  },
  services: [{
    type: String
  }],
  contactPerson: {
    name: String,
    phone: String,
    email: String
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: String,
    trim: true,
    default: ''
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: ''
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
BloodBankSchema.index({ location: '2dsphere' });
BloodBankSchema.index({ isActive: 1, approvalStatus: 1, isVerified: 1 });
BloodBankSchema.index({ createdAt: -1 });

// Hash password before saving
BloodBankSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  // Allow pre-hashed bcrypt passwords from secure migration/verification flows.
  if (/^\$2[aby]\$\d{2}\$/.test(this.password)) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
BloodBankSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('BloodBank', BloodBankSchema);
