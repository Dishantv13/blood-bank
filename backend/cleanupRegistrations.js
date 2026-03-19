// Script to remove fake/invalid registrations
import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api/blood-camps';

async function cleanupRegistrations() {
  try {
    console.log('🧹 Cleaning up invalid registrations...\n');
    
    const response = await axios.post(`${BASE_URL}/cleanup-registrations`);
    
    console.log('\n✅ Cleanup completed!');
    console.log(`📊 Results:`);
    console.log(`   - Removed invalid registrations: ${response.data.removed}`);
    console.log(`   - Camps processed: ${response.data.campsProcessed}`);
    
  } catch (error) {
    console.error('❌ Error details:');
    console.error('   - Message:', error.message);
    if (error.response) {
      console.error('   - Status:', error.response.status);
      console.error('   - Data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code) {
      console.error('   - Code:', error.code);
    }
    process.exit(1);
  }
}

cleanupRegistrations();
