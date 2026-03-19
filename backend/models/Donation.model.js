import mongoose from 'mongoose';

const DonationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bloodBank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodBank'
  },
  camp: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodCamp'
  },
  type: {
    type: String,
    enum: ['request', 'camp'],
    default: 'request'
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  volumeDonated: {
    type: Number, // In liters (L)
    default: 0
  },
  donationDate: {
    type: Date
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
DonationSchema.index({ donor: 1 });
DonationSchema.index({ bloodBank: 1 });
DonationSchema.index({ status: 1 });
DonationSchema.index({ type: 1 });

export default mongoose.model('Donation', DonationSchema);
