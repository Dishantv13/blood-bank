import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema({
  bloodBank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BloodBank',
    required: true,
    unique: true
  },
  bloodBankName: {
    type: String,
    required: true
  },
  items: [{
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
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastModified on save
InventorySchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

export default mongoose.model('Inventory', InventorySchema);
