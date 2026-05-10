const axios = require('axios');
const db = require('../config/database');

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Test Ollama connection on startup
(async () => {
  try {
    console.log('Testing Ollama connection...');
    console.log('Ollama URL:', OLLAMA_BASE_URL);
    console.log('Ollama Model:', OLLAMA_MODEL);
    
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
      model: OLLAMA_MODEL,
      messages: [{ role: 'user', content: 'Hello' }],
      stream: false,
    });
    console.log('✓ Ollama connection successful!');
  } catch (error) {
    console.error('✗ Ollama connection failed:', error.message);
    console.error('Please ensure:');
    console.error('1. Ollama is running');
    console.error('2. Model is downloaded: ollama pull', OLLAMA_MODEL);
    console.error('3. OLLAMA_BASE_URL is correct:', OLLAMA_BASE_URL);
  }
})();

class AIAnalysisService {
  /**
   * Analyze a test failure using AI
   */
  async analyzeFailure(scenarioId) {
    try {
      // Get scenario details with error information
      const scenarioResult = await db.query(
        `SELECT s.*, f.feature_name, te.environment, te.git_commit, te.execution_date
         FROM scenarios s
         JOIN features f ON s.feature_id = f.id
         JOIN test_executions te ON f.execution_id = te.id
         WHERE s.id = $1`,
        [scenarioId]
      );

      if (scenarioResult.rows.length === 0) {
        throw new Error('Scenario not found');
      }

      const scenario = scenarioResult.rows[0];

      // Get similar historical failures
      const similarFailures = await this.findSimilarFailures(scenario);

      // Get related Jira tickets
      const relatedJiraTickets = await this.findRelatedJiraTickets(scenario);

      // Check if this is a flaky test
      const flakyAnalysis = await this.analyzeFlakyBehavior(scenario.scenario_name);

      // Check if this is a new failure
      const isNewFailure = await this.isNewFailurePattern(scenario);

      // Generate AI-powered root cause analysis
      const aiAnalysis = await this.generateAIAnalysis(
        scenario,
        similarFailures,
        relatedJiraTickets,
        flakyAnalysis
      );

      // Store the analysis
      const analysisResult = await db.query(
        `INSERT INTO failure_analysis 
         (scenario_id, failure_type, root_cause, similar_failures, related_jira_tickets, 
          confidence_score, is_flaky, is_new_failure, ai_summary, suggested_owner)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          scenarioId,
          aiAnalysis.failureType,
          aiAnalysis.rootCause,
          JSON.stringify(similarFailures),
          JSON.stringify(relatedJiraTickets),
          aiAnalysis.confidenceScore,
          flakyAnalysis.isFlaky,
          isNewFailure,
          aiAnalysis.summary,
          aiAnalysis.suggestedOwner,
        ]
      );

      return analysisResult.rows[0];
    } catch (error) {
      console.error('Error in AI analysis:', error);
      throw error;
    }
  }

  /**
   * Find similar historical failures using text similarity
   */
  async findSimilarFailures(scenario) {
    try {
      const result = await db.query(
        `SELECT s.id, s.scenario_name, s.error_message, s.stack_trace, 
                te.execution_date, te.environment, te.git_commit
         FROM scenarios s
         JOIN features f ON s.feature_id = f.id
         JOIN test_executions te ON f.execution_id = te.id
         WHERE s.status = 'failed' 
         AND s.scenario_name = $1
         AND s.id != $2
         ORDER BY te.execution_date DESC
         LIMIT 10`,
        [scenario.scenario_name, scenario.id]
      );

      return result.rows.map(row => ({
        scenarioId: row.id,
        scenarioName: row.scenario_name,
        errorMessage: row.error_message,
        executionDate: row.execution_date,
        environment: row.environment,
        gitCommit: row.git_commit,
      }));
    } catch (error) {
      console.error('Error finding similar failures:', error);
      return [];
    }
  }

  /**
   * Find related Jira tickets based on failure patterns
   */
  async findRelatedJiraTickets(scenario) {
    try {
      // Simple keyword matching - can be enhanced with vector similarity
      const keywords = this.extractKeywords(scenario.error_message);
      
      if (keywords.length === 0) return [];

      const result = await db.query(
        `SELECT jira_key, summary, status, priority, assignee
         FROM jira_defects
         WHERE summary ILIKE ANY($1) OR description ILIKE ANY($1)
         ORDER BY created_date DESC
         LIMIT 5`,
        [keywords.map(k => `%${k}%`)]
      );

      return result.rows;
    } catch (error) {
      console.error('Error finding related Jira tickets:', error);
      return [];
    }
  }

  /**
   * Analyze if a test is flaky
   */
  async analyzeFlakyBehavior(scenarioName) {
    try {
      const result = await db.query(
        `SELECT 
          COUNT(*) FILTER (WHERE s.status = 'passed') as pass_count,
          COUNT(*) FILTER (WHERE s.status = 'failed') as fail_count,
          COUNT(*) as total_count
         FROM scenarios s
         JOIN features f ON s.feature_id = f.id
         JOIN test_executions te ON f.execution_id = te.id
         WHERE s.scenario_name = $1
         AND te.execution_date > NOW() - INTERVAL '30 days'`,
        [scenarioName]
      );

      const stats = result.rows[0];
      const passRate = stats.pass_count / stats.total_count;
      const failRate = stats.fail_count / stats.total_count;

      // A test is flaky if it has both passes and failures with neither being dominant
      const isFlaky = passRate > 0.1 && passRate < 0.9 && stats.total_count >= 5;
      const flakyScore = isFlaky ? Math.abs(0.5 - passRate) * 2 : 0;

      // Update flaky tests table
      if (isFlaky) {
        await db.query(
          `INSERT INTO flaky_tests (scenario_name, feature_name, flaky_score, pass_count, fail_count, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (scenario_name) 
           DO UPDATE SET flaky_score = $3, pass_count = $4, fail_count = $5, updated_at = NOW()`,
          [scenarioName, '', flakyScore, stats.pass_count, stats.fail_count]
        );
      }

      return {
        isFlaky,
        flakyScore,
        passCount: parseInt(stats.pass_count),
        failCount: parseInt(stats.fail_count),
      };
    } catch (error) {
      console.error('Error analyzing flaky behavior:', error);
      return { isFlaky: false, flakyScore: 0, passCount: 0, failCount: 0 };
    }
  }

  /**
   * Check if this is a new failure pattern
   */
  async isNewFailurePattern(scenario) {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as count
         FROM scenarios s
         JOIN features f ON s.feature_id = f.id
         JOIN test_executions te ON f.execution_id = te.id
         WHERE s.scenario_name = $1
         AND s.status = 'failed'
         AND te.execution_date < $2`,
        [scenario.scenario_name, scenario.created_at]
      );

      return parseInt(result.rows[0].count) === 0;
    } catch (error) {
      console.error('Error checking new failure:', error);
      return false;
    }
  }

  /**
   * Generate AI-powered analysis using Ollama (Local LLM)
   */
  async generateAIAnalysis(scenario, similarFailures, relatedJiraTickets, flakyAnalysis) {
    try {
      const prompt = this.buildAnalysisPrompt(scenario, similarFailures, relatedJiraTickets, flakyAnalysis);

      const systemPrompt = `You are an expert QA engineer and test failure analyst. Analyze test failures and provide:
1. Failure type classification (Infrastructure, Application Bug, Data Issue, Environment, Flaky Test, etc.)
2. Probable root cause
3. Confidence score (0.0 to 1.0)
4. Brief summary
5. Suggested owner/team

Respond ONLY with valid JSON format with keys: failureType, rootCause, confidenceScore, summary, suggestedOwner`;

      const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 1000,
        },
      });

      const generatedText = response.data.message.content;
      
      // Try to parse JSON from the response
      let analysis;
      try {
        // Look for JSON in the response
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Error parsing Ollama response:', parseError);
        console.log('Raw response:', generatedText);
        // Return default analysis if parsing fails
        analysis = {
          failureType: 'Unknown',
          rootCause: 'Unable to parse AI response',
          confidenceScore: 0.5,
          summary: generatedText.substring(0, 500),
          suggestedOwner: 'Unassigned',
        };
      }

      return {
        failureType: analysis.failureType || 'Unknown',
        rootCause: analysis.rootCause || 'Unable to determine',
        confidenceScore: analysis.confidenceScore || 0.5,
        summary: analysis.summary || 'Analysis unavailable',
        suggestedOwner: analysis.suggestedOwner || 'Unassigned',
      };
    } catch (error) {
      console.error('Error generating AI analysis:', error.message);
      console.error('Error details:', {
        name: error.name,
        code: error.code,
        cause: error.cause,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
      console.error('Ollama URL:', OLLAMA_BASE_URL);
      console.error('Ollama Model:', OLLAMA_MODEL);
      
      // Return default analysis if AI fails
      return {
        failureType: 'Unknown',
        rootCause: `AI analysis unavailable - ${error.message}`,
        confidenceScore: 0.0,
        summary: 'Unable to generate AI analysis. Please check if Ollama is running on ' + OLLAMA_BASE_URL,
        suggestedOwner: 'Unassigned',
      };
    }
  }

  /**
   * Build prompt for AI analysis
   */
  buildAnalysisPrompt(scenario, similarFailures, relatedJiraTickets, flakyAnalysis) {
    let prompt = `Analyze this test failure:

Scenario: ${scenario.scenario_name}
Feature: ${scenario.feature_name}
Environment: ${scenario.environment}
Error Message: ${scenario.error_message || 'No error message'}
Stack Trace: ${scenario.stack_trace ? scenario.stack_trace.substring(0, 500) : 'No stack trace'}

`;

    if (flakyAnalysis.isFlaky) {
      prompt += `\nFlaky Test Alert: This test has a flaky score of ${flakyAnalysis.flakyScore.toFixed(2)} with ${flakyAnalysis.passCount} passes and ${flakyAnalysis.failCount} failures in the last 30 days.\n`;
    }

    if (similarFailures.length > 0) {
      prompt += `\nSimilar Historical Failures (${similarFailures.length}):\n`;
      similarFailures.slice(0, 3).forEach((failure, idx) => {
        prompt += `${idx + 1}. Date: ${failure.executionDate}, Env: ${failure.environment}\n   Error: ${failure.errorMessage?.substring(0, 100) || 'N/A'}\n`;
      });
    }

    if (relatedJiraTickets.length > 0) {
      prompt += `\nRelated Jira Tickets:\n`;
      relatedJiraTickets.forEach((ticket, idx) => {
        prompt += `${idx + 1}. ${ticket.jira_key}: ${ticket.summary} (${ticket.status})\n`;
      });
    }

    return prompt;
  }

  /**
   * Extract keywords from error message
   */
  extractKeywords(errorMessage) {
    if (!errorMessage) return [];
    
    // Remove common words and extract meaningful terms
    const commonWords = ['error', 'exception', 'failed', 'the', 'a', 'an', 'in', 'on', 'at'];
    const words = errorMessage
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));
    
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Batch analyze all failures in an execution
   */
  async batchAnalyzeExecution(executionId) {
    try {
      const result = await db.query(
        `SELECT s.id
         FROM scenarios s
         JOIN features f ON s.feature_id = f.id
         WHERE f.execution_id = $1 AND s.status = 'failed'`,
        [executionId]
      );

      const analyses = [];
      for (const row of result.rows) {
        try {
          const analysis = await this.analyzeFailure(row.id);
          analyses.push(analysis);
        } catch (error) {
          console.error(`Error analyzing scenario ${row.id}:`, error);
        }
      }

      return analyses;
    } catch (error) {
      console.error('Error in batch analysis:', error);
      throw error;
    }
  }
}

module.exports = new AIAnalysisService();

// Made with Bob
