const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
require('dotenv').config();

const db = require('./config/database');
const aiAnalysisService = require('./services/aiAnalysisService');
const jiraService = require('./services/jiraService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== TEST EXECUTION ENDPOINTS ====================

/**
 * POST /api/executions - Create new test execution (Jenkins webhook)
 */
app.post('/api/executions', async (req, res) => {
  try {
    const {
      buildNumber,
      buildUrl,
      environment,
      gitCommit,
      gitBranch,
      cucumberReport,
      metadata,
    } = req.body;

    // Parse Cucumber report
    const stats = parseCucumberReport(cucumberReport);

    // Insert execution
    const executionResult = await db.query(
      `INSERT INTO test_executions 
       (build_number, build_url, environment, git_commit, git_branch, 
        total_scenarios, passed_scenarios, failed_scenarios, skipped_scenarios, 
        total_duration, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        buildNumber,
        buildUrl,
        environment,
        gitCommit,
        gitBranch,
        stats.totalScenarios,
        stats.passedScenarios,
        stats.failedScenarios,
        stats.skippedScenarios,
        stats.totalDuration,
        stats.status,
        JSON.stringify(metadata || {}),
      ]
    );

    const execution = executionResult.rows[0];

    // Process features and scenarios
    await processFeatures(execution.id, cucumberReport);

    // Trigger AI analysis for failures (async)
    if (stats.failedScenarios > 0) {
      aiAnalysisService.batchAnalyzeExecution(execution.id).catch(err => {
        console.error('Error in batch AI analysis:', err);
      });
    }

    res.status(201).json({
      success: true,
      execution,
      message: 'Test execution created successfully',
    });
  } catch (error) {
    console.error('Error creating execution:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/executions - Get test executions with filters
 */
app.get('/api/executions', async (req, res) => {
  try {
    const { environment, startDate, endDate, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM test_executions WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (environment) {
      query += ` AND environment = $${paramIndex}`;
      params.push(environment);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND execution_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND execution_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY execution_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      success: true,
      executions: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/executions/:id - Get execution details
 */
app.get('/api/executions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const executionResult = await db.query(
      'SELECT * FROM test_executions WHERE id = $1',
      [id]
    );

    if (executionResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Execution not found' });
    }

    const featuresResult = await db.query(
      'SELECT * FROM features WHERE execution_id = $1',
      [id]
    );

    res.json({
      success: true,
      execution: executionResult.rows[0],
      features: featuresResult.rows,
    });
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== HEATMAP ENDPOINTS ====================

/**
 * GET /api/heatmap - Get heatmap data for visualization
 */
app.get('/api/heatmap', async (req, res) => {
  try {
    const { days = 30, environment } = req.query;

    let query = `
      SELECT 
        DATE(execution_date) as date,
        environment,
        COUNT(*) as total_executions,
        SUM(passed_scenarios) as total_passed,
        SUM(failed_scenarios) as total_failed,
        SUM(skipped_scenarios) as total_skipped,
        ROUND(AVG(passed_scenarios::decimal / NULLIF(total_scenarios, 0) * 100), 2) as pass_rate
      FROM test_executions
      WHERE execution_date >= NOW() - INTERVAL '${parseInt(days)} days'
    `;

    const params = [];
    if (environment) {
      query += ' AND environment = $1';
      params.push(environment);
    }

    query += ' GROUP BY DATE(execution_date), environment ORDER BY date DESC, environment';

    const result = await db.query(query, params);

    res.json({
      success: true,
      heatmapData: result.rows,
    });
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

/**
 * GET /api/analytics/trends - Get failure trends
 */
app.get('/api/analytics/trends', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const result = await db.query(
      `SELECT 
        DATE(execution_date) as date,
        COUNT(*) as executions,
        SUM(failed_scenarios) as failures,
        ROUND(AVG(passed_scenarios::decimal / NULLIF(total_scenarios, 0) * 100), 2) as avg_pass_rate
       FROM test_executions
       WHERE execution_date >= NOW() - INTERVAL '${parseInt(days)} days'
       GROUP BY DATE(execution_date)
       ORDER BY date ASC`
    );

    res.json({
      success: true,
      trends: result.rows,
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/flaky-tests - Get flaky tests
 */
app.get('/api/analytics/flaky-tests', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM flaky_tests 
       WHERE flaky_score > 0.3
       ORDER BY flaky_score DESC 
       LIMIT 20`
    );

    res.json({
      success: true,
      flakyTests: result.rows,
    });
  } catch (error) {
    console.error('Error fetching flaky tests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/top-failures - Get most frequently failing scenarios
 */
app.get('/api/analytics/top-failures', async (req, res) => {
  try {
    const { days = 30, limit = 10 } = req.query;

    const result = await db.query(
      `SELECT 
        s.scenario_name,
        f.feature_name,
        COUNT(*) as failure_count,
        MAX(te.execution_date) as last_failed
       FROM scenarios s
       JOIN features f ON s.feature_id = f.id
       JOIN test_executions te ON f.execution_id = te.id
       WHERE s.status = 'failed'
       AND te.execution_date >= NOW() - INTERVAL '${parseInt(days)} days'
       GROUP BY s.scenario_name, f.feature_name
       ORDER BY failure_count DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      topFailures: result.rows,
    });
  } catch (error) {
    console.error('Error fetching top failures:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== AI ANALYSIS ENDPOINTS ====================

/**
 * GET /api/analysis/:scenarioId - Get AI analysis for a scenario
 */
app.get('/api/analysis/:scenarioId', async (req, res) => {
  try {
    const { scenarioId } = req.params;

    const result = await db.query(
      'SELECT * FROM failure_analysis WHERE scenario_id = $1',
      [scenarioId]
    );

    if (result.rows.length === 0) {
      // Trigger analysis if not exists
      const analysis = await aiAnalysisService.analyzeFailure(scenarioId);
      return res.json({ success: true, analysis });
    }

    res.json({
      success: true,
      analysis: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/analysis/:scenarioId/reanalyze - Trigger re-analysis
 */
app.post('/api/analysis/:scenarioId/reanalyze', async (req, res) => {
  try {
    const { scenarioId } = req.params;

    const analysis = await aiAnalysisService.analyzeFailure(scenarioId);

    res.json({
      success: true,
      analysis,
      message: 'Re-analysis completed',
    });
  } catch (error) {
    console.error('Error re-analyzing:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== JIRA ENDPOINTS ====================

/**
 * POST /api/jira/sync - Sync Jira defects
 */
app.post('/api/jira/sync', async (req, res) => {
  try {
    const count = await jiraService.syncJiraDefects();
    res.json({
      success: true,
      message: `Synced ${count} Jira defects`,
      count,
    });
  } catch (error) {
    console.error('Error syncing Jira:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/jira/create-defect - Create Jira defect from failure
 */
app.post('/api/jira/create-defect', async (req, res) => {
  try {
    const { scenarioId } = req.body;

    const ticket = await jiraService.createDefectFromFailure(scenarioId);

    res.json({
      success: true,
      ticket,
      message: 'Jira defect created successfully',
    });
  } catch (error) {
    console.error('Error creating Jira defect:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

function parseCucumberReport(report) {
  let totalScenarios = 0;
  let passedScenarios = 0;
  let failedScenarios = 0;
  let skippedScenarios = 0;
  let totalDuration = 0;

  if (Array.isArray(report)) {
    report.forEach(feature => {
      if (feature.elements) {
        feature.elements.forEach(scenario => {
          totalScenarios++;
          const scenarioStatus = getScenarioStatus(scenario);
          
          if (scenarioStatus === 'passed') passedScenarios++;
          else if (scenarioStatus === 'failed') failedScenarios++;
          else if (scenarioStatus === 'skipped') skippedScenarios++;

          if (scenario.steps) {
            scenario.steps.forEach(step => {
              if (step.result && step.result.duration) {
                totalDuration += step.result.duration;
              }
            });
          }
        });
      }
    });
  }

  return {
    totalScenarios,
    passedScenarios,
    failedScenarios,
    skippedScenarios,
    totalDuration: Math.round(totalDuration / 1000000), // Convert to milliseconds
    status: failedScenarios > 0 ? 'failed' : 'passed',
  };
}

function getScenarioStatus(scenario) {
  if (!scenario.steps || scenario.steps.length === 0) return 'skipped';
  
  const hasFailedStep = scenario.steps.some(step => step.result && step.result.status === 'failed');
  const hasSkippedStep = scenario.steps.some(step => step.result && step.result.status === 'skipped');
  
  if (hasFailedStep) return 'failed';
  if (hasSkippedStep) return 'skipped';
  return 'passed';
}

async function processFeatures(executionId, report) {
  if (!Array.isArray(report)) return;

  for (const feature of report) {
    const featureStats = calculateFeatureStats(feature);

    const featureResult = await db.query(
      `INSERT INTO features 
       (execution_id, feature_name, feature_uri, total_scenarios, passed_scenarios, 
        failed_scenarios, skipped_scenarios, duration, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        executionId,
        feature.name,
        feature.uri,
        featureStats.total,
        featureStats.passed,
        featureStats.failed,
        featureStats.skipped,
        featureStats.duration,
        featureStats.status,
      ]
    );

    const featureId = featureResult.rows[0].id;

    // Process scenarios
    if (feature.elements) {
      for (const scenario of feature.elements) {
        await processScenario(featureId, scenario);
      }
    }
  }
}

function calculateFeatureStats(feature) {
  let total = 0, passed = 0, failed = 0, skipped = 0, duration = 0;

  if (feature.elements) {
    feature.elements.forEach(scenario => {
      total++;
      const status = getScenarioStatus(scenario);
      if (status === 'passed') passed++;
      else if (status === 'failed') failed++;
      else if (status === 'skipped') skipped++;

      if (scenario.steps) {
        scenario.steps.forEach(step => {
          if (step.result && step.result.duration) {
            duration += step.result.duration;
          }
        });
      }
    });
  }

  return {
    total,
    passed,
    failed,
    skipped,
    duration: Math.round(duration / 1000000),
    status: failed > 0 ? 'failed' : 'passed',
  };
}

async function processScenario(featureId, scenario) {
  const status = getScenarioStatus(scenario);
  let duration = 0;
  let errorMessage = null;
  let stackTrace = null;

  if (scenario.steps) {
    scenario.steps.forEach(step => {
      if (step.result) {
        if (step.result.duration) duration += step.result.duration;
        if (step.result.status === 'failed' && step.result.error_message) {
          errorMessage = step.result.error_message;
          stackTrace = step.result.error_message; // Cucumber includes stack in error_message
        }
      }
    });
  }

  const tags = scenario.tags ? scenario.tags.map(tag => tag.name) : [];

  const scenarioResult = await db.query(
    `INSERT INTO scenarios 
     (feature_id, scenario_name, scenario_type, status, duration, error_message, stack_trace, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      featureId,
      scenario.name,
      scenario.type,
      status,
      Math.round(duration / 1000000),
      errorMessage,
      stackTrace,
      tags,
    ]
  );

  const scenarioId = scenarioResult.rows[0].id;

  // Process steps
  if (scenario.steps) {
    for (const step of scenario.steps) {
      await db.query(
        `INSERT INTO steps 
         (scenario_id, step_keyword, step_name, status, duration, error_message)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          scenarioId,
          step.keyword,
          step.name,
          step.result ? step.result.status : 'skipped',
          step.result && step.result.duration ? Math.round(step.result.duration / 1000000) : 0,
          step.result && step.result.error_message ? step.result.error_message : null,
        ]
      );
    }
  }
}

// ==================== START SERVER ====================

async function startServer() {
  try {
    // Initialize database
    await db.initializeDatabase();
    console.log('Database initialized');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;

// Made with Bob
