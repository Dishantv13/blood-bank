// Quick script to fix empty registration data
import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api/blood-camps';

async function fixRegistrations() {
  try {
    console.log('🔧 Fixing registration data...\n');
    
    const response = await axios.post(`${BASE_URL}/fix-registrations`);
    
    console.log('\n✅ Fix completed!');
    console.log(`📊 Results:`);
    console.log(`   - Fixed registrations: ${response.data.fixed}`);
    console.log(`   - Errors: ${response.data.errors}`);
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

fixRegistrations();
