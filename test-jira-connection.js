require('dotenv').config();
const axios = require('axios');

async function testJiraConnection() {
  console.log('Testing Jira connection...\n');
  
  const jiraHost = process.env.JIRA_HOST;
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;
  
  console.log('Configuration:');
  console.log('- Jira Host:', jiraHost);
  console.log('- Jira Email:', jiraEmail);
  console.log('- Project Key:', projectKey);
  console.log('- API Token:', jiraToken ? `${jiraToken.substring(0, 20)}...` : 'NOT SET');
  console.log();
  
  if (!jiraHost || !jiraEmail || !jiraToken) {
    console.error('✗ Jira configuration incomplete!');
    console.error('Please set JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN in .env file');
    process.exit(1);
  }
  
  const client = axios.create({
    baseURL: `${jiraHost}/rest/api/3`,
    auth: {
      username: jiraEmail,
      password: jiraToken,
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  
  try {
    // Test 1: Get current user
    console.log('1. Testing authentication...');
    const userResponse = await client.get('/myself');
    console.log(`✓ Authenticated as: ${userResponse.data.displayName} (${userResponse.data.emailAddress})`);
    
    // Test 2: Get project info
    console.log('\n2. Testing project access...');
    const projectResponse = await client.get(`/project/${projectKey}`);
    console.log(`✓ Project found: ${projectResponse.data.name}`);
    console.log(`  - Key: ${projectResponse.data.key}`);
    console.log(`  - Lead: ${projectResponse.data.lead?.displayName || 'Unknown'}`);
    
    // Test 3: Search for recent bugs
    console.log('\n3. Testing issue search...');
    const jql = `project = ${projectKey} AND type = Bug AND created >= -30d ORDER BY created DESC`;
    const searchResponse = await client.get('/search', {
      params: {
        jql,
        maxResults: 5,
        fields: 'summary,status,priority,created',
      },
    });
    
    console.log(`✓ Found ${searchResponse.data.total} bugs in last 30 days`);
    if (searchResponse.data.issues.length > 0) {
      console.log('\n  Recent bugs:');
      searchResponse.data.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.key}: ${issue.fields.summary}`);
        console.log(`     Status: ${issue.fields.status.name}, Priority: ${issue.fields.priority?.name || 'None'}`);
      });
    }
    
    // Test 4: Get issue types
    console.log('\n4. Testing issue type access...');
    const issueTypesResponse = await client.get(`/project/${projectKey}/statuses`);
    const bugType = issueTypesResponse.data.find(type => type.name === 'Bug');
    if (bugType) {
      console.log(`✓ Bug issue type available`);
      console.log(`  Available statuses: ${bugType.statuses.map(s => s.name).join(', ')}`);
    }
    
    console.log('\n✓✓✓ All Jira tests passed! Connection is working correctly.');
    console.log('\nYou can now:');
    console.log('- Sync Jira defects to the database');
    console.log('- Create new Jira tickets from test failures');
    console.log('- Link test failures to existing Jira tickets');
    
  } catch (error) {
    console.error('\n✗ Jira connection failed!');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.error('\nAuthentication failed. Please check:');
        console.error('1. JIRA_EMAIL is correct');
        console.error('2. JIRA_API_TOKEN is valid (generate new one at: https://id.atlassian.com/manage-profile/security/api-tokens)');
      } else if (error.response.status === 404) {
        console.error('\nResource not found. Please check:');
        console.error('1. JIRA_HOST is correct (should be like: https://your-domain.atlassian.net)');
        console.error('2. JIRA_PROJECT_KEY exists and you have access to it');
      }
    }
    
    process.exit(1);
  }
}

testJiraConnection();

// Made with Bob
