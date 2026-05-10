#!/usr/bin/env node

/**
 * Database Fix Script
 * Adds the triggered_by column to existing test_executions table
 * 
 * Usage: node fix-database.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'test_analytics',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function fixDatabase() {
  console.log('===========================================');
  console.log('Database Fix - Adding triggered_by column');
  console.log('===========================================\n');

  const client = await pool.connect();
  
  try {
    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'test_executions' 
      AND column_name = 'triggered_by'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ Column "triggered_by" already exists!');
      console.log('No changes needed.\n');
    } else {
      console.log('Adding "triggered_by" column...');
      
      await client.query(`
        ALTER TABLE test_executions 
        ADD COLUMN triggered_by VARCHAR(100)
      `);
      
      console.log('✓ Column "triggered_by" added successfully!\n');
    }

    // Verify the column
    const verifyResult = await client.query(`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'test_executions' 
      AND column_name = 'triggered_by'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('Verification:');
      console.log('  Column Name:', verifyResult.rows[0].column_name);
      console.log('  Data Type:', verifyResult.rows[0].data_type);
      console.log('  Max Length:', verifyResult.rows[0].character_maximum_length);
      console.log('\n✓ Database fix completed successfully!');
      console.log('\nYou can now restart your server.\n');
    }

  } catch (error) {
    console.error('\n❌ Error fixing database:', error.message);
    console.error('\nPlease check:');
    console.error('1. PostgreSQL is running');
    console.error('2. Database credentials in .env are correct');
    console.error('3. You have permission to alter tables\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDatabase();

// Made with Bob
