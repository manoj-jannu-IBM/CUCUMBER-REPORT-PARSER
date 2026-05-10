# Jira Integration Setup Guide

This guide will help you set up and test Jira connectivity for the Test Analytics Platform.

## Overview

The platform integrates with Jira in **READ-ONLY MODE** to:
- **Sync defects** from Jira to local database for analysis
- **View related tickets** for test failures
- **Track defect trends** and correlate with test failures

**Note:** Ticket creation is disabled. The system only reads data from Jira.

## Prerequisites

1. **Jira Cloud Account** (Atlassian)
2. **Project Access** with permission to create and view issues
3. **API Token** for authentication

## Step 1: Generate Jira API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **"Create API token"**
3. Give it a name (e.g., "Test Analytics Platform")
4. Click **"Create"**
5. **Copy the token** immediately (you won't be able to see it again)

## Step 2: Configure Environment Variables

Update your `.env` file with your Jira credentials:

```env
# Jira Configuration
JIRA_HOST=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_api_token_here
JIRA_PROJECT_KEY=YOUR_PROJECT_KEY
```

### Finding Your Values:

- **JIRA_HOST**: Your Jira URL (e.g., `https://ibm-middleware.atlassian.net`)
  - Remove `/jira` from the end if present
  - Should be just the base domain

- **JIRA_EMAIL**: The email address associated with your Jira account

- **JIRA_API_TOKEN**: The token you generated in Step 1

- **JIRA_PROJECT_KEY**: Your project key (e.g., `TEST`, `PROJ`)
  - Found in Jira project settings or in issue keys like `TEST-123`

## Step 3: Test Jira Connection

Run the test script to verify your configuration:

```bash
node test-jira-connection.js
```

### Expected Output:

```
Testing Jira connection...

Configuration:
- Jira Host: https://your-domain.atlassian.net
- Jira Email: your-email@example.com
- Project Key: TEST
- API Token: ATATT3xFfGF0Tbdifv2w...

1. Testing authentication...
✓ Authenticated as: John Doe (john.doe@example.com)

2. Testing project access...
✓ Project found: Test Project
  - Key: TEST
  - Lead: John Doe

3. Testing issue search...
✓ Found 15 bugs in last 30 days

  Recent bugs:
  1. TEST-123: Login page crashes on mobile
     Status: In Progress, Priority: High
  2. TEST-122: API timeout on large datasets
     Status: Open, Priority: Medium

4. Testing issue type access...
✓ Bug issue type available
  Available statuses: To Do, In Progress, Done

✓✓✓ All Jira tests passed! Connection is working correctly.
```

## Step 4: Sync Jira Defects

Once connection is verified, sync existing Jira defects to your database:

### Option 1: Via API (Recommended)

```bash
curl -X POST http://localhost:5000/api/jira/sync
```

### Option 2: Via Code

```javascript
const jiraService = require('./server/services/jiraService');
await jiraService.syncJiraDefects();
```

This will:
- Fetch all bugs from the last 90 days
- Store them in the `jira_defects` table
- Enable correlation with test failures

## Step 5: Using Jira Features

### 5.1 View Related Tickets

The AI analysis automatically finds related Jira tickets based on:
- Error message similarity
- Test name matching
- Historical correlations

## Troubleshooting

### Error: 401 Unauthorized

**Cause:** Invalid credentials

**Solutions:**
1. Verify `JIRA_EMAIL` matches your Atlassian account email
2. Generate a new API token (old one may have expired)
3. Ensure no extra spaces in `.env` file

### Error: 404 Not Found

**Cause:** Invalid host or project key

**Solutions:**
1. Check `JIRA_HOST` format (should be `https://domain.atlassian.net`)
2. Remove `/jira` suffix if present
3. Verify `JIRA_PROJECT_KEY` exists and you have access

### Error: 403 Forbidden

**Cause:** Insufficient permissions

**Solutions:**
1. Ensure you have "Browse Projects" permission
2. Verify you can create issues in the project
3. Check with your Jira admin for proper role assignment

### Connection Timeout

**Cause:** Network or firewall issues

**Solutions:**
1. Check if you can access Jira in browser
2. Verify no corporate proxy blocking API calls
3. Try from a different network

## API Reference

### Sync Defects (Read-Only)
```
POST /api/jira/sync
```
Syncs recent bugs from Jira to local database for analysis.

### Get Defects (Read-Only)
```
GET /api/jira/defects?status=Open&priority=High
```
Retrieves Jira defects with optional filters.

**Note:** Ticket creation and modification endpoints are disabled in read-only mode.

## Database Schema

Jira data is stored in the `jira_defects` table:

```sql
CREATE TABLE jira_defects (
  id SERIAL PRIMARY KEY,
  jira_key VARCHAR(50) UNIQUE NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  status VARCHAR(50),
  priority VARCHAR(50),
  assignee VARCHAR(100),
  created_date TIMESTAMP,
  resolved_date TIMESTAMP,
  synced_at TIMESTAMP DEFAULT NOW()
);
```

## Best Practices

1. **Regular Syncing**: Set up a cron job to sync defects daily
   ```javascript
   // In server/index.js
   const cron = require('node-cron');
   cron.schedule('0 0 * * *', async () => {
     await jiraService.syncJiraDefects();
   });
   ```

2. **Selective Creation**: Don't create tickets for every failure
   - Use AI confidence scores
   - Check for existing similar tickets
   - Filter out flaky tests

3. **Proper Labeling**: Add labels to auto-created tickets
   - `automated-test-failure`
   - Environment name
   - Test suite name

4. **Security**: Never commit `.env` file
   - Use `.env.example` as template
   - Rotate API tokens periodically
   - Use different tokens for Dev/Prod

## Advanced Configuration

### Custom JQL Queries

Modify the sync query in `server/services/jiraService.js`:

```javascript
const jql = `project = ${this.projectKey} 
  AND type = Bug 
  AND labels = "test-automation"
  AND created >= -90d 
  ORDER BY created DESC`;
```

### Custom Issue Fields

Add custom fields to ticket creation:

```javascript
const issueData = {
  fields: {
    project: { key: this.projectKey },
    summary: `Test Failure: ${scenario.scenario_name}`,
    description: aiAnalysis.summary,
    issuetype: { name: 'Bug' },
    priority: { name: 'High' },
    labels: ['automated-test', 'test-failure'],
    // Add custom fields
    customfield_10001: 'Automation',
    customfield_10002: scenario.environment,
  }
};
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Run `node test-jira-connection.js` for diagnostics
3. Review Jira API documentation: https://developer.atlassian.com/cloud/jira/platform/rest/v3/

## Related Documentation

- [Jira REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [API Token Management](https://id.atlassian.com/manage-profile/security/api-tokens)
- [Jira Query Language (JQL)](https://www.atlassian.com/software/jira/guides/expand-jira/jql)