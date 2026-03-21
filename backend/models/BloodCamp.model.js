import mongoose from 'mongoose';

const BloodCampSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodBank',
    required: true
  },
  organizerName: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String
  },
  pincode: {
    type: String
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
  targetUnits: {
    type: Number,
    required: true,
    min: 1
  },
  collectedUnits: {
    type: Number,
    default: 0
  },
  description: {
    type: String
  },
  contactPhone: {
    type: String
  },
  contactEmail: {
    type: String
  },
  registeredDonors: [{
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    phone: String,
    bloodGroup: String,
    registeredAt: {
      type: Date,
      default: Date.now
    },
    attended: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['scheduled', 'upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isFake: {
    type: Boolean,
    default: false
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geospatial queries
BloodCampSchema.index({ location: '2dsphere' });
BloodCampSchema.index({ date: 1 });
BloodCampSchema.index({ city: 1 });
BloodCampSchema.index({ organizer: 1, date: -1 });
BloodCampSchema.index({ status: 1, date: 1 });

// Update the updatedAt field before saving
BloodCampSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('BloodCamp', BloodCampSchema);
