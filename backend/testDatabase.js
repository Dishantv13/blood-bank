import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BloodBank from './models/BloodBank.js';
import BloodCamp from './models/BloodCamp.js';
import Inventory from './models/Inventory.js';
import BloodRequest from './models/BloodRequest.js';

dotenv.config();

// Test database operations
const testDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
    console.log('📊 Database: rtbms\n');

    // Test 1: Check BloodBanks
    console.log('=== BLOOD BANKS ===');
    const bloodBanks = await BloodBank.find({});
    console.log(`Total Blood Banks: ${bloodBanks.length}`);
    bloodBanks.forEach(bb => {
      console.log(`  - ${bb.name} (${bb._id})`);
      console.log(`    Email: ${bb.email}`);
      console.log(`    Phone: ${bb.phone}`);
    });

    // Test 2: Check Inventory
    console.log('\n=== INVENTORY ===');
    const inventories = await Inventory.find({}).populate('bloodBank', 'name');
    console.log(`Total Inventories: ${inventories.length}`);
    inventories.forEach(inv => {
      console.log(`  - ${inv.bloodBankName || inv.bloodBank?.name}`);
      console.log(`    Blood Types: ${inv.items.length}`);
      const totalUnits = inv.items.reduce((sum, item) => sum + item.units, 0);
      console.log(`    Total Units: ${totalUnits}`);
      inv.items.forEach(item => {
        console.log(`      ${item.bloodGroup}: ${item.units} units`);
      });
    });

    // Test 3: Check Blood Camps
    console.log('\n=== BLOOD CAMPS ===');
    const camps = await BloodCamp.find({}).populate('organizer', 'name');
    console.log(`Total Blood Camps: ${camps.length}`);
    camps.forEach(camp => {
      console.log(`  - ${camp.name}`);
      console.log(`    Organizer: ${camp.organizerName || camp.organizer?.name}`);
      console.log(`    Date: ${camp.date}`);
      console.log(`    Venue: ${camp.venue}, ${camp.city}`);
      console.log(`    Target: ${camp.targetUnits} units`);
      console.log(`    Status: ${camp.status}`);
    });

    // Test 4: Check Blood Requests
    console.log('\n=== BLOOD REQUESTS ===');
    const requests = await BloodRequest.find({});
    console.log(`Total Blood Requests: ${requests.length}`);
    requests.forEach(req => {
      console.log(`  - ${req.bloodGroup} (${req.units} units)`);
      console.log(`    Status: ${req.status}`);
      console.log(`    Urgency: ${req.urgency}`);
    });

    // Test 5: Database Statistics
    console.log('\n=== DATABASE STATISTICS ===');
    const stats = await mongoose.connection.db.stats();
    console.log(`Database Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Collections: ${stats.collections}`);
    console.log(`Indexes: ${stats.indexes}`);

    // List all collections
    console.log('\n=== ALL COLLECTIONS ===');
    const collections = await mongoose.connection.db.listCollections().toArray();
    collections.forEach(coll => {
      console.log(`  - ${coll.name}`);
    });

    console.log('\n✅ Database test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

testDatabase();
