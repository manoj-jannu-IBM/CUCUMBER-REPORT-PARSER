-- Clear all failed AI analyses so they can be regenerated
-- Run this to force re-analysis with the fixed Ollama connection

DELETE FROM failure_analysis 
WHERE failure_type = 'Unknown' 
  AND root_cause LIKE '%AI analysis unavailable%';

-- Show how many were deleted
SELECT 'Cleared failed analyses' as message;