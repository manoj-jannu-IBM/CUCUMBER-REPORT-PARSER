# Cycle Name Feature Guide

## Overview

The Cycle Name feature allows you to group multiple Cucumber test reports under a single test cycle. When multiple reports are sent with the same `cycle_name` and `environment`, they are automatically merged into a single execution record.

## Key Features

- **50-character cycle name field** for organizing test executions
- **Automatic merging** of multiple reports with the same cycle name and environment
- **Cumulative statistics** - test counts and durations are added together
- **Unique constraint** on (cycle_name, environment) combination
- **Frontend display** showing cycle names in execution lists and details

## Use Cases

### 1. Parallel Test Execution
Run tests in parallel across multiple machines and merge results:
```bash
# Machine 1 - Run smoke tests
curl -X POST http://localhost:5000/api/executions \
  -H "Content-Type: application/json" \
  -d '{
    "buildNumber": "BUILD-1234",
    "cycleName": "Sprint-24.1",
    "environment": "Dev",
    "cucumberReport": [...smoke tests...]
  }'

# Machine 2 - Run regression tests
curl -X POST http://localhost:5000/api/executions \
  -H "Content-Type: application/json" \
  -d '{
    "buildNumber": "BUILD-1234",
    "cycleName": "Sprint-24.1",
    "environment": "Dev",
    "cucumberReport": [...regression tests...]
  }'

# Result: Both reports merged into single "Sprint-24.1" execution
```

### 2. Incremental Test Runs
Add test results incrementally throughout the day:
```bash
# Morning run
POST /api/executions
{
  "cycleName": "Daily-2024-05-10",
  "environment": "Stage",
  "cucumberReport": [...]
}

# Afternoon run - adds to same cycle
POST /api/executions
{
  "cycleName": "Daily-2024-05-10",
  "environment": "Stage",
  "cucumberReport": [...]
}
```

### 3. Sprint/Release Cycles
Organize tests by sprint or release:
```bash
# Sprint cycle
"cycleName": "Sprint-24.1"

# Release cycle
"cycleName": "Release-2024.Q2"

# Hotfix cycle
"cycleName": "Hotfix-CVE-2024-001"
```

## API Usage

### Creating a New Execution with Cycle Name

**Endpoint:** `POST /api/executions`

**Request Body:**
```json
{
  "buildNumber": "BUILD-1234",
  "cycleName": "Sprint-24.1",
  "buildUrl": "https://jenkins.example.com/job/test/1234",
  "environment": "Dev",
  "gitCommit": "abc123def456",
  "gitBranch": "main",
  "triggeredBy": "Jenkins",
  "cucumberReport": [
    {
      "name": "Login Feature",
      "elements": [...]
    }
  ],
  "metadata": {
    "executor": "CI/CD",
    "node": "node-1"
  }
}
```

**Response (New Execution):**
```json
{
  "success": true,
  "execution": {
    "id": 1,
    "build_number": "BUILD-1234",
    "cycle_name": "Sprint-24.1",
    "environment": "Dev",
    "total_scenarios": 10,
    "passed_scenarios": 8,
    "failed_scenarios": 2,
    "skipped_scenarios": 0
  },
  "message": "Test execution created successfully",
  "merged": false
}
```

**Response (Merged Execution):**
```json
{
  "success": true,
  "execution": {
    "id": 1,
    "build_number": "BUILD-1234",
    "cycle_name": "Sprint-24.1",
    "environment": "Dev",
    "total_scenarios": 25,
    "passed_scenarios": 20,
    "failed_scenarios": 5,
    "skipped_scenarios": 0
  },
  "message": "Test execution merged into cycle: Sprint-24.1",
  "merged": true
}
```

## Database Schema

### test_executions Table
```sql
CREATE TABLE test_executions (
  id SERIAL PRIMARY KEY,
  build_number VARCHAR(100) NOT NULL,
  cycle_name VARCHAR(50),              -- NEW FIELD
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
  UNIQUE(cycle_name, environment)      -- UNIQUE CONSTRAINT
);
```

## Migration for Existing Database

If you have an existing database, run the migration script:

```bash
psql -U postgres -d test_analytics -f add-cycle-name-column.sql
```

Or use the Node.js database reset:
```bash
node reset-db-with-new-data.js
```

## Frontend Display

### Executions List Page
- New "Cycle Name" column showing cycle names with 🔄 icon
- Displays "-" for executions without cycle names

### Execution Details Page
- Cycle name displayed as a chip with secondary color
- Only shown when cycle_name is present

## Merging Behavior

### What Gets Merged
When a report with an existing (cycle_name, environment) combination is received:

1. **Cumulative Counts:**
   - `total_scenarios` += new scenarios
   - `passed_scenarios` += new passed
   - `failed_scenarios` += new failed
   - `skipped_scenarios` += new skipped
   - `total_duration` += new duration

2. **Status Update:**
   - Status becomes "failed" if any failures exist
   - Otherwise remains "passed"

3. **Metadata Update:**
   - Fields like `build_url`, `git_commit`, etc. are updated if provided
   - Existing values are preserved if new values are null

4. **Features & Scenarios:**
   - All features and scenarios from new report are added
   - No deduplication - each report's scenarios are stored separately

### What Doesn't Get Merged
- Different environments are kept separate
- Different cycle names are kept separate
- Executions without cycle_name are never merged

## Best Practices

### 1. Naming Conventions
Use consistent naming patterns:
- Sprint cycles: `Sprint-24.1`, `Sprint-24.2`
- Release cycles: `Release-2024.Q1`, `Release-2024.Q2`
- Daily runs: `Daily-2024-05-10`
- Feature branches: `Feature-AUTH-123`
- Hotfixes: `Hotfix-CVE-2024-001`

### 2. Environment Separation
Always use different cycle names or environments to keep results separate:
```bash
# Good - Different environments
"cycleName": "Sprint-24.1", "environment": "Dev"
"cycleName": "Sprint-24.1", "environment": "Stage"

# Good - Different cycle names
"cycleName": "Sprint-24.1-Dev", "environment": "Dev"
"cycleName": "Sprint-24.1-Stage", "environment": "Stage"
```

### 3. Build Numbers
Even when merging, provide unique build numbers for tracking:
```bash
"buildNumber": "BUILD-1234-part1"
"buildNumber": "BUILD-1234-part2"
```

### 4. Optional Usage
Cycle name is optional - omit it for standalone executions:
```json
{
  "buildNumber": "BUILD-1234",
  "environment": "Dev",
  "cucumberReport": [...]
}
```

## Example: Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    stages {
        stage('Run Tests') {
            parallel {
                stage('Smoke Tests') {
                    steps {
                        sh 'npm run test:smoke'
                        script {
                            def report = readJSON file: 'smoke-report.json'
                            httpRequest(
                                url: "${TEST_ANALYTICS_URL}/api/executions",
                                httpMode: 'POST',
                                contentType: 'APPLICATION_JSON',
                                requestBody: """
                                {
                                    "buildNumber": "${BUILD_NUMBER}",
                                    "cycleName": "Sprint-${SPRINT_VERSION}",
                                    "environment": "${ENVIRONMENT}",
                                    "cucumberReport": ${report}
                                }
                                """
                            )
                        }
                    }
                }
                
                stage('Regression Tests') {
                    steps {
                        sh 'npm run test:regression'
                        script {
                            def report = readJSON file: 'regression-report.json'
                            httpRequest(
                                url: "${TEST_ANALYTICS_URL}/api/executions",
                                httpMode: 'POST',
                                contentType: 'APPLICATION_JSON',
                                requestBody: """
                                {
                                    "buildNumber": "${BUILD_NUMBER}",
                                    "cycleName": "Sprint-${SPRINT_VERSION}",
                                    "environment": "${ENVIRONMENT}",
                                    "cucumberReport": ${report}
                                }
                                """
                            )
                        }
                    }
                }
            }
        }
    }
}
```

## Troubleshooting

### Issue: Reports Not Merging
**Check:**
1. Cycle names match exactly (case-sensitive)
2. Environments match exactly
3. Both reports sent to same server instance

### Issue: Duplicate Constraint Error
**Cause:** Trying to create execution with existing (cycle_name, environment)
**Solution:** This is expected - the merge logic should handle it automatically

### Issue: Missing Cycle Name in UI
**Check:**
1. Database migration completed successfully
2. Frontend code updated
3. Browser cache cleared

## Summary

The Cycle Name feature provides powerful test organization and merging capabilities:

✅ Group related test runs under a single cycle
✅ Merge parallel test executions automatically
✅ Track cumulative test results
✅ Organize by sprint, release, or custom cycles
✅ Maintain separate results per environment

For questions or issues, refer to the main documentation or check the server logs.