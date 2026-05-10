require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function clearFailedAnalyses() {
  try {
    console.log('Clearing failed AI analyses...');
    
    const result = await pool.query(`
      DELETE FROM failure_analysis 
      WHERE failure_type = 'Unknown' 
        AND root_cause LIKE '%AI analysis unavailable%'
      RETURNING id
    `);
    
    console.log(`✓ Cleared ${result.rowCount} failed analyses`);
    console.log('Now refresh the page and click AI analysis again - it will generate a fresh analysis with Ollama');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

clearFailedAnalyses();

// Made with Bob
