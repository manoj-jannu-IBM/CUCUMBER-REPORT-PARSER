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
      cycleName,
      buildUrl,
      environment,
      gitCommit,
      gitBranch,
      triggeredBy,
      cucumberReport,
      metadata,
    } = req.body;

    // Parse Cucumber report
    const stats = parseCucumberReport(cucumberReport);

    let execution;
    let isNewExecution = true;

    // Check if execution with same cycle_name and environment exists
    if (cycleName) {
      const existingResult = await db.query(
        'SELECT * FROM test_executions WHERE cycle_name = $1 AND environment = $2',
        [cycleName, environment]
      );

      if (existingResult.rows.length > 0) {
        // Merge with existing execution
        execution = existingResult.rows[0];
        isNewExecution = false;
        
        console.log(`Merging report into existing cycle: ${cycleName} (${environment})`);
        
        // Update execution with merged stats
        const updatedResult = await db.query(
          `UPDATE test_executions
           SET total_scenarios = total_scenarios + $1,
               passed_scenarios = passed_scenarios + $2,
               failed_scenarios = failed_scenarios + $3,
               skipped_scenarios = skipped_scenarios + $4,
               total_duration = total_duration + $5,
               status = CASE WHEN (failed_scenarios + $3) > 0 THEN 'failed' ELSE 'passed' END,
               build_url = COALESCE($6, build_url),
               git_commit = COALESCE($7, git_commit),
               git_branch = COALESCE($8, git_branch),
               triggered_by = COALESCE($9, triggered_by),
               metadata = COALESCE($10, metadata)
           WHERE id = $11
           RETURNING *`,
          [
            stats.totalScenarios,
            stats.passedScenarios,
            stats.failedScenarios,
            stats.skippedScenarios,
            stats.totalDuration,
            buildUrl,
            gitCommit,
            gitBranch,
            triggeredBy,
            metadata ? JSON.stringify(metadata) : null,
            execution.id
          ]
        );
        
        execution = updatedResult.rows[0];
      }
    }

    // Create new execution if no existing cycle found
    if (isNewExecution) {
      const executionResult = await db.query(
        `INSERT INTO test_executions
         (build_number, cycle_name, build_url, environment, git_commit, git_branch, triggered_by,
          total_scenarios, passed_scenarios, failed_scenarios, skipped_scenarios,
          total_duration, status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          buildNumber,
          cycleName || null,
          buildUrl,
          environment,
          gitCommit,
          gitBranch,
          triggeredBy,
          stats.totalScenarios,
          stats.passedScenarios,
          stats.failedScenarios,
          stats.skippedScenarios,
          stats.totalDuration,
          stats.status,
          JSON.stringify(metadata || {}),
        ]
      );

      execution = executionResult.rows[0];
    }

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
      message: isNewExecution
        ? 'Test execution created successfully'
        : `Test execution merged into cycle: ${cycleName}`,
      merged: !isNewExecution,
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
    const { environment, startDate, endDate, cycleName, limit = 50, offset = 0 } = req.query;

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

    if (cycleName) {
      query += ` AND cycle_name ILIKE $${paramIndex}`;
      params.push(`%${cycleName}%`);
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
      'SELECT * FROM features WHERE execution_id = $1 ORDER BY id',
      [id]
    );

    // Get scenarios for each feature
    const featuresWithScenarios = await Promise.all(
      featuresResult.rows.map(async (feature) => {
        const scenariosResult = await db.query(
          'SELECT * FROM scenarios WHERE feature_id = $1 ORDER BY id',
          [feature.id]
        );
        return {
          ...feature,
          scenarios: scenariosResult.rows,
        };
      })
    );

    res.json({
      success: true,
      execution: executionResult.rows[0],
      features: featuresWithScenarios,
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
        ROUND(AVG(passed_scenarios::decimal / NULLIF(total_scenarios, 0) * 100), 2) as pass_rate,
        STRING_AGG(DISTINCT triggered_by, ', ') as triggered_by_list
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

/**
 * GET /api/scenarios/failure-frequency - Get failure frequency for a scenario
 */
app.get('/api/scenarios/failure-frequency', async (req, res) => {
  try {
    const { scenarioName } = req.query;

    if (!scenarioName) {
      return res.status(400).json({ success: false, error: 'scenarioName is required' });
    }

    // Get failure statistics for this scenario across all executions
    const result = await db.query(
      `SELECT
        COUNT(*) as total_executions,
        SUM(CASE WHEN s.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN s.status = 'passed' THEN 1 ELSE 0 END) as passed_count,
        SUM(CASE WHEN s.status = 'skipped' THEN 1 ELSE 0 END) as skipped_count,
        MAX(CASE WHEN s.status = 'failed' THEN te.execution_date END) as last_failed,
        MIN(CASE WHEN s.status = 'failed' THEN te.execution_date END) as first_failed,
        MAX(CASE WHEN s.status = 'passed' THEN te.execution_date END) as last_passed
       FROM scenarios s
       JOIN features f ON s.feature_id = f.id
       JOIN test_executions te ON f.execution_id = te.id
       WHERE s.scenario_name = $1
       AND te.execution_date >= NOW() - INTERVAL '90 days'`,
      [scenarioName]
    );

    if (result.rows.length === 0 || result.rows[0].total_executions === 0) {
      return res.json({
        success: true,
        total_executions: 0,
        failed_count: 0,
        passed_count: 0,
        skipped_count: 0,
        failure_rate: 0,
        last_failed: null,
        first_failed: null,
        last_passed: null
      });
    }

    const stats = result.rows[0];
    const failureRate = parseInt(stats.failed_count) / parseInt(stats.total_executions);

    res.json({
      success: true,
      total_executions: parseInt(stats.total_executions),
      failed_count: parseInt(stats.failed_count),
      passed_count: parseInt(stats.passed_count),
      skipped_count: parseInt(stats.skipped_count),
      failure_rate: failureRate,
      last_failed: stats.last_failed,
      first_failed: stats.first_failed,
      last_passed: stats.last_passed
    });
  } catch (error) {
    console.error('Error fetching failure frequency:', error);
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
    console.log('Fetching AI analysis for scenario:', scenarioId);

    const result = await db.query(
      'SELECT * FROM failure_analysis WHERE scenario_id = $1',
      [scenarioId]
    );

    if (result.rows.length === 0) {
      console.log('No existing analysis found, triggering new analysis...');
      // Trigger analysis if not exists
      const analysis = await aiAnalysisService.analyzeFailure(scenarioId);
      console.log('Analysis completed:', analysis);
      return res.json({ success: true, analysis });
    }

    console.log('Returning existing analysis');
    res.json({
      success: true,
      analysis: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching analysis:', error.message);
    console.error('Error stack:', error.stack);
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
 * DISABLED: Read-only mode - ticket creation not allowed
 */
app.post('/api/jira/create-defect', async (req, res) => {
  res.status(403).json({
    success: false,
    error: 'Jira ticket creation is disabled. System is in read-only mode.'
  });
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
