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
    minlength: 6
  },
  phone: {
    type: String,
    required: true
  },
  logo: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
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
    default: ''
  },
  profileImagePublicId: {
    type: String,
    default: ''
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
    default: 0
  },
  lockUntil: {
    type: Date
  },
  passwordReset: {
    token: String,
    expiresAt: Date
  },
  authSession: {
    refreshTokenHash: {
      type: String,
      default: null
    },
    refreshTokenIssuedAt: {
      type: Date,
      default: null
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
BloodBankSchema.index({ isActive: 1, isVerified: 1 });
BloodBankSchema.index({ createdAt: -1 });

// Hash password before saving
BloodBankSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
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
