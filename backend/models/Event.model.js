import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  organizer: {
    type: String,
    required: true
  },
  organizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'organizerModel'
  },
  organizerModel: {
    type: String,
    enum: ['User', 'BloodBank'],
    default: 'User'
  },
  eventType: {
    type: String,
    enum: ['blood-drive', 'awareness', 'donation-camp', 'health-checkup'],
    default: 'blood-drive'
  },
  location: {
    name: String,
    address: String,
    coordinates: {
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
  contactInfo: {
    phone: String,
    email: String
  },
  expectedDonors: {
    type: Number,
    default: 0
  },
  registeredDonors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  visibility: {
    type: String,
    enum: ['public', 'donors-only', 'patients-only'],
    default: 'public'
  },
  maxParticipants: {
    type: Number,
    default: 100
  },
  isFake: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
EventSchema.index({ organizedBy: 1, organizerModel: 1 });
EventSchema.index({ date: 1 });
EventSchema.index({ isActive: 1 });
EventSchema.index({ isActive: 1, date: 1 });
EventSchema.index({ registeredDonors: 1, date: 1 });
EventSchema.index({ 'location.coordinates': '2dsphere' });

export default mongoose.model('Event', EventSchema);
