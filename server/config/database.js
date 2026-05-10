const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'test_analytics',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
// Drop all tables (use with caution!)
const dropDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Dropping all tables...');
    
    await client.query(`
      DROP TABLE IF EXISTS steps CASCADE;
      DROP TABLE IF EXISTS failure_analysis CASCADE;
      DROP TABLE IF EXISTS scenarios CASCADE;
      DROP TABLE IF EXISTS features CASCADE;
      DROP TABLE IF EXISTS test_executions CASCADE;
      DROP TABLE IF EXISTS jira_defects CASCADE;
      DROP TABLE IF EXISTS flaky_tests CASCADE;
    `);

    await client.query('COMMIT');
    console.log('All tables dropped successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error dropping tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Reset database (drop and recreate all tables)
const resetDatabase = async () => {
  console.log('Resetting database...');
  await dropDatabase();
  await initializeDatabase();
  console.log('Database reset complete');
};


// Database schema initialization
const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Test Executions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_executions (
        id SERIAL PRIMARY KEY,
        build_number VARCHAR(100) NOT NULL,
        cycle_name VARCHAR(50),
        build_url TEXT,
        environment VARCHAR(50) NOT NULL,
        git_commit VARCHAR(100),
        git_branch VARCHAR(100),
        triggered_by VARCHAR(100),
        execution_date TIMESTAMP NOT NULL DEFAULT NOW(),
        total_scenarios INTEGER NOT NULL,
        passed_scenarios INTEGER NOT NULL,
        failed_scenarios INTEGER NOT NULL,
        skipped_scenarios INTEGER NOT NULL,
        total_duration INTEGER,
        status VARCHAR(20) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(cycle_name, environment)
      )
    `);

    // Features table
    await client.query(`
      CREATE TABLE IF NOT EXISTS features (
        id SERIAL PRIMARY KEY,
        execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
        feature_name VARCHAR(255) NOT NULL,
        feature_uri TEXT,
        total_scenarios INTEGER NOT NULL,
        passed_scenarios INTEGER NOT NULL,
        failed_scenarios INTEGER NOT NULL,
        skipped_scenarios INTEGER NOT NULL,
        duration INTEGER,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Scenarios table
    await client.query(`
      CREATE TABLE IF NOT EXISTS scenarios (
        id SERIAL PRIMARY KEY,
        feature_id INTEGER REFERENCES features(id) ON DELETE CASCADE,
        scenario_name VARCHAR(500) NOT NULL,
        scenario_type VARCHAR(50),
        status VARCHAR(20) NOT NULL,
        duration INTEGER,
        error_message TEXT,
        stack_trace TEXT,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Steps table
    await client.query(`
      CREATE TABLE IF NOT EXISTS steps (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        step_keyword VARCHAR(20),
        step_name TEXT NOT NULL,
        status VARCHAR(20) NOT NULL,
        duration INTEGER,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Failure Analysis table (AI-powered insights)
    await client.query(`
      CREATE TABLE IF NOT EXISTS failure_analysis (
        id SERIAL PRIMARY KEY,
        scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
        failure_type VARCHAR(100),
        root_cause TEXT,
        similar_failures JSONB,
        related_jira_tickets JSONB,
        confidence_score DECIMAL(3,2),
        is_flaky BOOLEAN DEFAULT FALSE,
        is_new_failure BOOLEAN DEFAULT FALSE,
        ai_summary TEXT,
        suggested_owner VARCHAR(100),
        analyzed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Jira Defects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS jira_defects (
        id SERIAL PRIMARY KEY,
        jira_key VARCHAR(50) UNIQUE NOT NULL,
        summary TEXT NOT NULL,
        description TEXT,
        status VARCHAR(50),
        priority VARCHAR(20),
        assignee VARCHAR(100),
        created_date TIMESTAMP,
        resolved_date TIMESTAMP,
        failure_pattern TEXT,
        stack_trace_hash VARCHAR(64),
        synced_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Flaky Tests tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS flaky_tests (
        id SERIAL PRIMARY KEY,
        scenario_name VARCHAR(500) NOT NULL,
        feature_name VARCHAR(255) NOT NULL,
        flaky_score DECIMAL(3,2),
        pass_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        last_passed TIMESTAMP,
        last_failed TIMESTAMP,
        first_detected TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_executions_date ON test_executions(execution_date DESC);
      CREATE INDEX IF NOT EXISTS idx_executions_env ON test_executions(environment);
      CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios(status);
      CREATE INDEX IF NOT EXISTS idx_scenarios_name ON scenarios(scenario_name);
      CREATE INDEX IF NOT EXISTS idx_failure_analysis_scenario ON failure_analysis(scenario_id);
      CREATE INDEX IF NOT EXISTS idx_jira_key ON jira_defects(jira_key);
      CREATE INDEX IF NOT EXISTS idx_flaky_score ON flaky_tests(flaky_score DESC);
    `);

    await client.query('COMMIT');
    console.log('Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  initializeDatabase,
  dropDatabase,
  resetDatabase,
  query: (text, params) => pool.query(text, params),
};

// Made with Bob
