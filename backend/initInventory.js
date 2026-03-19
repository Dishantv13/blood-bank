import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BloodBank from './models/BloodBank.js';

dotenv.config();

// Initialize inventory for all blood banks
const initializeInventory = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const bloodBanks = await BloodBank.find({});
    console.log(`Found ${bloodBanks.length} blood banks`);

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    for (const bloodBank of bloodBanks) {
      console.log(`\nProcessing: ${bloodBank.name}`);
      console.log(`Current inventory:`, bloodBank.inventory);

      // Check if inventory exists and has all blood groups
      if (!bloodBank.inventory || bloodBank.inventory.length === 0) {
        console.log('  ⚠️  No inventory found. Creating default inventory...');
        bloodBank.inventory = bloodGroups.map(group => ({
          bloodGroup: group,
          units: 0,
          lastUpdated: new Date()
        }));
      } else {
        // Add missing blood groups
        const existingGroups = bloodBank.inventory.map(item => item.bloodGroup);
        const missingGroups = bloodGroups.filter(group => !existingGroups.includes(group));
        
        if (missingGroups.length > 0) {
          console.log(`  ⚠️  Missing blood groups: ${missingGroups.join(', ')}`);
          missingGroups.forEach(group => {
            bloodBank.inventory.push({
              bloodGroup: group,
              units: 0,
              lastUpdated: new Date()
            });
          });
        }
      }

      // Ensure all inventory items have lastUpdated field
      bloodBank.inventory = bloodBank.inventory.map(item => ({
        ...item,
        lastUpdated: item.lastUpdated || new Date()
      }));

      await bloodBank.save();
      console.log(`  ✅ Inventory initialized for ${bloodBank.name}`);
      console.log(`  Inventory:`, bloodBank.inventory);
    }

    console.log('\n✅ All blood banks initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

initializeInventory();
