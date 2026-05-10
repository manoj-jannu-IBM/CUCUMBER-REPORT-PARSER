const db = require('./server/config/database');
const { generateSampleData } = require('./server/scripts/sampleData');

/**
 * Reset database and generate new sample data with updated environment names
 */
async function resetDatabaseWithNewData() {
  console.log('🔄 Starting database reset...\n');
  
  try {
    // Step 1: Reset database (drop and recreate tables)
    console.log('Step 1: Resetting database schema...');
    await db.resetDatabase();
    console.log('✅ Database schema reset complete\n');
    
    // Step 2: Generate new sample data with updated environment names and cycle names
    console.log('Step 2: Generating sample data with new features...');
    console.log('   Environment Names:');
    console.log('   - Dev (was: dev)');
    console.log('   - Stage (was: qa)');
    console.log('   - Preprod (was: staging)');
    console.log('   - Prod (was: production)');
    console.log('   Cycle Names:');
    console.log('   - Sprint-24.x, Release-2024.Qx, Hotfix-xxx');
    console.log('   - Regression-Suite, Smoke-Tests, Daily-Run, etc.\n');
    
    await generateSampleData();
    console.log('✅ Sample data generation complete\n');
    
    console.log('🎉 Database reset and data generation completed successfully!');
    console.log('📊 You can now access the dashboard at http://localhost:3000');
    console.log('📝 Sample data includes cycle names for test organization');
    console.log('🔄 Multiple reports with same cycle_name + environment will be merged');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database reset:', error);
    process.exit(1);
  }
}

// Run the reset
resetDatabaseWithNewData();

// Made with Bob
