const axios = require('axios');
const db = require('../config/database');

class JiraService {
  constructor() {
    this.jiraHost = process.env.JIRA_HOST;
    this.jiraEmail = process.env.JIRA_EMAIL;
    this.jiraToken = process.env.JIRA_API_TOKEN;
    this.projectKey = process.env.JIRA_PROJECT_KEY;
    
    this.client = axios.create({
      baseURL: `${this.jiraHost}/rest/api/3`,
      auth: {
        username: this.jiraEmail,
        password: this.jiraToken,
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Sync Jira defects to local database
   */
  async syncJiraDefects() {
    try {
      if (!this.jiraHost || !this.jiraToken) {
        console.log('Jira configuration not found, skipping sync');
        return;
      }

      const jql = `project = ${this.projectKey} AND type = Bug AND created >= -90d ORDER BY created DESC`;
      
      const response = await this.client.get('/search', {
        params: {
          jql,
          maxResults: 100,
          fields: 'summary,description,status,priority,assignee,created,resolutiondate',
        },
      });

      const issues = response.data.issues;
      
      for (const issue of issues) {
        await this.saveJiraDefect(issue);
      }

      console.log(`Synced ${issues.length} Jira defects`);
      return issues.length;
    } catch (error) {
      console.error('Error syncing Jira defects:', error.message);
      throw error;
    }
  }

  /**
   * Save Jira defect to database
   */
  async saveJiraDefect(issue) {
    try {
      const fields = issue.fields;
      
      await db.query(
        `INSERT INTO jira_defects 
         (jira_key, summary, description, status, priority, assignee, created_date, resolved_date, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (jira_key) 
         DO UPDATE SET 
           summary = $2, 
           description = $3, 
           status = $4, 
           priority = $5, 
           assignee = $6,
           resolved_date = $8,
           synced_at = NOW()`,
        [
          issue.key,
          fields.summary,
          fields.description || '',
          fields.status?.name || 'Unknown',
          fields.priority?.name || 'Medium',
          fields.assignee?.displayName || 'Unassigned',
          fields.created,
          fields.resolutiondate || null,
        ]
      );
    } catch (error) {
      console.error(`Error saving Jira defect ${issue.key}:`, error);
    }
  }

  /**
   * Create a new Jira ticket from test failure
   */
  async createDefectFromFailure(scenarioId) {
    try {
      if (!this.jiraHost || !this.jiraToken) {
        throw new Error('Jira configuration not found');
      }

      // Get scenario and analysis details
      const result = await db.query(
        `SELECT s.*, f.feature_name, te.environment, te.build_number, te.git_commit,
                fa.root_cause, fa.ai_summary, fa.failure_type
         FROM scenarios s
         JOIN features f ON s.feature_id = f.id
         JOIN test_executions te ON f.execution_id = te.id
         LEFT JOIN failure_analysis fa ON s.id = fa.scenario_id
         WHERE s.id = $1`,
        [scenarioId]
      );

      if (result.rows.length === 0) {
        throw new Error('Scenario not found');
      }

      const scenario = result.rows[0];

      // Create Jira issue
      const issueData = {
        fields: {
          project: {
            key: this.projectKey,
          },
          summary: `Test Failure: ${scenario.scenario_name}`,
          description: this.buildJiraDescription(scenario),
          issuetype: {
            name: 'Bug',
          },
          priority: {
            name: this.determinePriority(scenario),
          },
          labels: ['automated-test', 'test-failure', scenario.failure_type || 'unknown'],
        },
      };

      const response = await this.client.post('/issue', issueData);
      
      console.log(`Created Jira ticket: ${response.data.key}`);
      return response.data;
    } catch (error) {
      console.error('Error creating Jira defect:', error.message);
      throw error;
    }
  }

  /**
   * Build Jira description from scenario data
   */
  buildJiraDescription(scenario) {
    let description = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Test Failure Details' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Feature: ', marks: [{ type: 'strong' }] },
            { type: 'text', text: scenario.feature_name },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Scenario: ', marks: [{ type: 'strong' }] },
            { type: 'text', text: scenario.scenario_name },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Environment: ', marks: [{ type: 'strong' }] },
            { type: 'text', text: scenario.environment },
          ],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Build: ', marks: [{ type: 'strong' }] },
            { type: 'text', text: scenario.build_number },
          ],
        },
      ],
    };

    if (scenario.ai_summary) {
      description.content.push(
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'AI Analysis' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: scenario.ai_summary }],
        }
      );
    }

    if (scenario.root_cause) {
      description.content.push(
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Probable Root Cause' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: scenario.root_cause }],
        }
      );
    }

    if (scenario.error_message) {
      description.content.push(
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Error Message' }],
        },
        {
          type: 'codeBlock',
          content: [{ type: 'text', text: scenario.error_message }],
        }
      );
    }

    if (scenario.stack_trace) {
      description.content.push(
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Stack Trace' }],
        },
        {
          type: 'codeBlock',
          content: [{ type: 'text', text: scenario.stack_trace.substring(0, 1000) }],
        }
      );
    }

    return description;
  }

  /**
   * Determine priority based on failure characteristics
   */
  determinePriority(scenario) {
    if (scenario.failure_type === 'Infrastructure') {
      return 'High';
    }
    if (scenario.failure_type === 'Application Bug') {
      return 'High';
    }
    if (scenario.failure_type === 'Flaky Test') {
      return 'Low';
    }
    return 'Medium';
  }

  /**
   * Search for similar Jira tickets
   */
  async searchSimilarTickets(searchText) {
    try {
      if (!this.jiraHost || !this.jiraToken) {
        return [];
      }

      const jql = `project = ${this.projectKey} AND type = Bug AND text ~ "${searchText}" ORDER BY created DESC`;
      
      const response = await this.client.get('/search', {
        params: {
          jql,
          maxResults: 10,
          fields: 'summary,status,priority,assignee',
        },
      });

      return response.data.issues.map(issue => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status?.name,
        priority: issue.fields.priority?.name,
        assignee: issue.fields.assignee?.displayName,
      }));
    } catch (error) {
      console.error('Error searching Jira tickets:', error.message);
      return [];
    }
  }

  /**
   * Get Jira ticket details
   */
  async getTicketDetails(jiraKey) {
    try {
      const response = await this.client.get(`/issue/${jiraKey}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting Jira ticket ${jiraKey}:`, error.message);
      throw error;
    }
  }

  /**
   * Link test failure to existing Jira ticket
   */
  async linkFailureToTicket(scenarioId, jiraKey) {
    try {
      // Store the link in database
      await db.query(
        `UPDATE failure_analysis 
         SET related_jira_tickets = jsonb_set(
           COALESCE(related_jira_tickets, '[]'::jsonb),
           '{0}',
           $2::jsonb,
           true
         )
         WHERE scenario_id = $1`,
        [scenarioId, JSON.stringify({ jira_key: jiraKey, linked_at: new Date() })]
      );

      console.log(`Linked scenario ${scenarioId} to Jira ticket ${jiraKey}`);
      return true;
    } catch (error) {
      console.error('Error linking failure to Jira ticket:', error);
      throw error;
    }
  }
}

module.exports = new JiraService();

// Made with Bob
