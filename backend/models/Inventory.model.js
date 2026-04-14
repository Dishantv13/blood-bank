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
}, {
  timestamps: true
});

// Update items lastUpdated on save if modified
InventorySchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.items.forEach(item => {
      item.lastUpdated = new Date();
    });
  }
  next();
});

InventorySchema.index({ 'items.bloodGroup': 1 });
InventorySchema.index({ updatedAt: -1 });

export default mongoose.model('Inventory', InventorySchema);
