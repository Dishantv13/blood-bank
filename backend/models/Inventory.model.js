import mongoose from "mongoose";
import { BLOOD_GROUPS } from "../validations/validation.constants.js";

const InventorySchema = new mongoose.Schema(
  {
    bloodBank: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BloodBank",
      required: true,
      unique: true,
    },
    bloodBankName: {
      type: String,
      required: true,
    },
    items: [
      {
        bloodGroup: {
          type: String,
          enum: BLOOD_GROUPS,
          required: true,
        },
        units: {
          type: Number,
          default: 0,
          min: 0,
        },
        components: [
          {
            componentType: {
              type: String,
              enum: ["RBC", "Plasma", "Platelets", "Cryoprecipitate"],
              required: true,
            },
            units: {
              type: Number,
              default: 0,
              min: 0,
            },
            lastUpdated: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        lastUpdated: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Update items lastUpdated on save if modified
InventorySchema.pre("save", function () {
  if (this.isModified("items")) {
    this.items.forEach((item) => {
      item.lastUpdated = new Date();
    });
  }
});

InventorySchema.index({ "items.bloodGroup": 1 });
InventorySchema.index({ updatedAt: -1 });

export default mongoose.model("Inventory", InventorySchema);