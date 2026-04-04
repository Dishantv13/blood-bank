import mongoose from 'mongoose';

const BloodRequestSchema = new mongoose.Schema({
  requestType: {
    type: String,
    enum: ['user', 'bloodbank'],
    default: 'user'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function requiredRequestedBy() {
      return this.requestType === 'user';
    }
  },
  requestingBloodBank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodBank'
  },
  targetBloodBank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodBank'
  },
  patientName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  units: {
    type: Number,
    required: true,
    min: 1
  },
  urgency: {
    type: String,
    enum: ['critical', 'urgent', 'normal'],
    default: 'normal'
  },
  hospital: {
    name: String,
    address: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number]
      }
    }
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (value) => /^[0-9]{10}$/.test(String(value).replace(/\D/g, '')),
      message: 'Contact number must be 10 digits'
    }
  },
  requiredBy: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default: 7 days from now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'fulfilled', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  bloodBank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodBank'
  },
  bloodBankResponse: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected']
    },
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodBank'
    },
    responseNote: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isFake: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
BloodRequestSchema.index({ status: 1, requestType: 1, createdAt: -1 });
BloodRequestSchema.index({ bloodBank: 1, status: 1 });
BloodRequestSchema.index({ targetBloodBank: 1, status: 1 });
BloodRequestSchema.index({ requestingBloodBank: 1, status: 1 });
BloodRequestSchema.index({ requestedBy: 1, requestType: 1, createdAt: -1 });
BloodRequestSchema.index({ createdAt: -1 });
BloodRequestSchema.index({ status: 1, bloodGroup: 1, urgency: 1, createdAt: -1 });

export default mongoose.model('BloodRequest', BloodRequestSchema);
