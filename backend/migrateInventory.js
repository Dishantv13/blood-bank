import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BloodBank from './models/BloodBank.js';
import Inventory from './models/Inventory.js';

dotenv.config();

// Migrate inventory from BloodBank to Inventory collection
const migrateInventory = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const bloodBanks = await BloodBank.find({});
    console.log(`Found ${bloodBanks.length} blood banks`);

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    for (const bloodBank of bloodBanks) {
      console.log(`\nProcessing: ${bloodBank.name} (${bloodBank._id})`);

      // Check if inventory already exists
      let inventory = await Inventory.findOne({ bloodBank: bloodBank._id });

      if (inventory) {
        console.log('  ℹ️  Inventory already exists, updating...');
      } else {
        console.log('  ⚠️  Creating new inventory...');
        inventory = new Inventory({
          bloodBank: bloodBank._id,
          bloodBankName: bloodBank.name,
          items: []
        });
      }

      // Migrate from embedded inventory if exists
      if (bloodBank.inventory && bloodBank.inventory.length > 0) {
        console.log('  📦 Migrating from embedded inventory...');
        inventory.items = bloodBank.inventory.map(item => ({
          bloodGroup: item.bloodGroup,
          units: item.units || 0,
          lastUpdated: item.lastUpdated || new Date()
        }));
      } else {
        // Initialize with default inventory
        console.log('  📦 Initializing default inventory...');
        inventory.items = bloodGroups.map(group => ({
          bloodGroup: group,
          units: 0,
          lastUpdated: new Date()
        }));
      }

      // Ensure all blood groups are present
      const existingGroups = inventory.items.map(item => item.bloodGroup);
      const missingGroups = bloodGroups.filter(group => !existingGroups.includes(group));
      
      if (missingGroups.length > 0) {
        console.log(`  ➕ Adding missing blood groups: ${missingGroups.join(', ')}`);
        missingGroups.forEach(group => {
          inventory.items.push({
            bloodGroup: group,
            units: 0,
            lastUpdated: new Date()
          });
        });
      }

      await inventory.save();
      console.log(`  ✅ Inventory saved for ${bloodBank.name}`);
      console.log(`  Total items: ${inventory.items.length}`);
      
      // Log current units
      const unitsStr = inventory.items
        .map(item => `${item.bloodGroup}:${item.units}`)
        .join(', ');
      console.log(`  Units: ${unitsStr}`);
    }

    console.log('\n✅ All blood bank inventories migrated successfully');
    console.log('\n📊 Summary:');
    const totalInventories = await Inventory.countDocuments();
    console.log(`Total inventories: ${totalInventories}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

migrateInventory();
