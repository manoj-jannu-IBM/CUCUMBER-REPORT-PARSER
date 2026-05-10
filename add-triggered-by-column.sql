-- Add triggered_by column to existing test_executions table
-- Run this SQL script in your PostgreSQL database

-- Check if column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'test_executions'
        AND column_name = 'triggered_by'
    ) THEN
        ALTER TABLE test_executions ADD COLUMN triggered_by VARCHAR(100);
        RAISE NOTICE 'Column triggered_by added successfully';
    ELSE
        RAISE NOTICE 'Column triggered_by already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'test_executions'
AND column_name = 'triggered_by';

-- Optional: Set a default value for existing records
-- UPDATE test_executions SET triggered_by = 'Unknown' WHERE triggered_by IS NULL;