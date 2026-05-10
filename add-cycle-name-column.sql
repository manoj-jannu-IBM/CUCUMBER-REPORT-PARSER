-- Migration script to add cycle_name column to existing database
-- Run this if you have an existing database

BEGIN;

-- Add cycle_name column to test_executions table
ALTER TABLE test_executions 
ADD COLUMN IF NOT EXISTS cycle_name VARCHAR(50);

-- Drop existing unique constraint if it exists
ALTER TABLE test_executions 
DROP CONSTRAINT IF EXISTS test_executions_cycle_name_environment_key;

-- Add unique constraint for cycle_name and environment combination
-- This allows multiple reports with same cycle_name to be merged
ALTER TABLE test_executions 
ADD CONSTRAINT test_executions_cycle_name_environment_key 
UNIQUE (cycle_name, environment);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_executions_cycle_name ON test_executions(cycle_name);

COMMIT;

-- Verification query
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'test_executions' 
AND column_name = 'cycle_name';