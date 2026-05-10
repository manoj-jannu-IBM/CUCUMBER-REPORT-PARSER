const db = require('./server/config/database');
const fs = require('fs');
const path = require('path');

/**
 * Import Cucumber report and generate sample data based on actual test scenarios
 */
async function importCucumberReport() {
  console.log('🔄 Starting Cucumber report import and database setup...\n');
  
  try {
    // Step 1: Read the Cucumber report
    console.log('Step 1: Reading Cucumber report...');
    const reportPath = process.argv[2] || './cucumber-report.json';
    
    if (!fs.existsSync(reportPath)) {
      console.error(`❌ Cucumber report not found at: ${reportPath}`);
      console.log('Usage: node import-cucumber-report.js <path-to-cucumber-report.json>');
      process.exit(1);
    }
    
    const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    console.log(`✅ Loaded report with ${reportData.length} feature(s)\n`);
    
    // Step 2: Reset database
    console.log('Step 2: Resetting database...');
    await db.resetDatabase();
    console.log('✅ Database reset complete\n');
    
    // Step 3: Extract scenarios from report
    console.log('Step 3: Extracting test scenarios...');
    const scenarios = extractScenarios(reportData);
    console.log(`✅ Found ${scenarios.length} unique scenarios\n`);
    
    // Step 4: Generate sample data
    console.log('Step 4: Generating sample test executions...');
    await generateSampleData(scenarios);
    console.log('✅ Sample data generation complete\n');
    
    console.log('🎉 Import completed successfully!');
    console.log('📊 You can now access the dashboard at http://localhost:3000');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during import:', error);
    process.exit(1);
  }
}

/**
 * Extract unique scenarios from Cucumber report
 */
function extractScenarios(reportData) {
  const scenarios = [];
  const scenarioMap = new Map();
  
  reportData.forEach(feature => {
    const featureName = feature.name;
    
    feature.elements.forEach(element => {
      const scenarioName = element.name;
      const tags = element.tags ? element.tags.map(t => t.name) : [];
      
      // Create unique key
      const key = `${featureName}::${scenarioName}`;
      
      if (!scenarioMap.has(key)) {
        // Determine if this scenario typically fails based on actual status
        const actualStatus = element.steps && element.steps.length > 0
          ? element.steps[element.steps.length - 1].result.status
          : 'passed';
        
        // Get error message if failed
        let errorMessage = null;
        if (actualStatus === 'failed') {
          const failedStep = element.steps.find(s => s.result.status === 'failed');
          if (failedStep && failedStep.result.error_message) {
            errorMessage = failedStep.result.error_message.split('\n')[0]; // First line only
          }
        }
        
        scenarioMap.set(key, {
          featureName,
          scenarioName,
          tags,
          actualStatus,
          errorMessage,
          // Assign failure probability based on actual status
          failureProbability: actualStatus === 'failed' ? 0.3 : 0.05
        });
      }
    });
  });
  
  return Array.from(scenarioMap.values());
}

/**
 * Generate sample data with realistic pass/fail patterns
 */
async function generateSampleData(scenarios) {
  const environments = ['Dev', 'Stage', 'Preprod', 'Prod'];
  const daysToGenerate = 30;
  const today = new Date();
  
  // Group scenarios by feature
  const featureMap = new Map();
  scenarios.forEach(scenario => {
    if (!featureMap.has(scenario.featureName)) {
      featureMap.set(scenario.featureName, []);
    }
    featureMap.get(scenario.featureName).push(scenario);
  });
  
  const features = Array.from(featureMap.keys());
  
  // Generate cycle names for sample data
  const cycleNames = [
    'Sprint-24.1', 'Sprint-24.2', 'Sprint-24.3', 'Sprint-24.4',
    'Release-2024.Q1', 'Release-2024.Q2', 'Hotfix-123', 'Regression-Suite'
  ];
  
  for (let day = 0; day < daysToGenerate; day++) {
    const executionDate = new Date(today);
    executionDate.setDate(today.getDate() - day);
    
    // Generate 1-3 executions per day
    const executionsPerDay = Math.floor(Math.random() * 3) + 1;
    
    for (let exec = 0; exec < executionsPerDay; exec++) {
      const environment = environments[Math.floor(Math.random() * environments.length)];
      const buildNumber = `BUILD-${1000 + day * 10 + exec}`;
      const cycleName = cycleNames[Math.floor(Math.random() * cycleNames.length)];
      
      // Select random features for this execution (3-6 features)
      const numFeatures = Math.min(Math.floor(Math.random() * 4) + 3, features.length);
      const selectedFeatures = shuffleArray([...features]).slice(0, numFeatures);
      
      let totalScenarios = 0;
      let passedScenarios = 0;
      let failedScenarios = 0;
      let skippedScenarios = 0;
      
      // Insert execution placeholder
      const executionResult = await db.query(
        `INSERT INTO test_executions
         (build_number, cycle_name, build_url, environment, git_commit, git_branch, triggered_by,
          execution_date, total_scenarios, passed_scenarios, failed_scenarios,
          skipped_scenarios, total_duration, status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          buildNumber,
          cycleName,
          `https://jenkins.example.com/job/test/${buildNumber}`,
          environment,
          generateGitCommit(),
          'main',
          ['Jenkins', 'GitHub Actions', 'Manual'][Math.floor(Math.random() * 3)],
          executionDate,
          0, 0, 0, 0, 0, 'passed',
          JSON.stringify({ executor: 'CI/CD', node: 'node-1' })
        ]
      );
      
      const executionId = executionResult.rows[0].id;
      
      // Process each selected feature
      for (const featureName of selectedFeatures) {
        const featureScenarios = featureMap.get(featureName);
        
        let featurePassed = 0;
        let featureFailed = 0;
        let featureSkipped = 0;
        let featureDuration = 0;
        
        // Insert feature
        const featureResult = await db.query(
          `INSERT INTO features
           (execution_id, feature_name, feature_uri, total_scenarios,
            passed_scenarios, failed_scenarios, skipped_scenarios, duration, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [
            executionId,
            featureName,
            `features/${featureName.toLowerCase().replace(/\s+/g, '_')}.feature`,
            featureScenarios.length,
            0, 0, 0, 0, 'passed'
          ]
        );
        
        const featureId = featureResult.rows[0].id;
        
        // Insert scenarios
        for (const scenario of featureScenarios) {
          // Determine status based on failure probability
          let status;
          const rand = Math.random();
          if (rand < scenario.failureProbability) {
            status = 'failed';
          } else if (rand < scenario.failureProbability + 0.05) {
            status = 'skipped';
          } else {
            status = 'passed';
          }
          
          const duration = Math.floor(Math.random() * 10000) + 1000;
          featureDuration += duration;
          
          let errorMessage = null;
          let stackTrace = null;
          
          if (status === 'failed') {
            errorMessage = scenario.errorMessage || getRandomError();
            stackTrace = `${errorMessage}\n  at TestStep.execute(test.js:${Math.floor(Math.random() * 100) + 1})\n  at Runner.run(runner.js:45)`;
            featureFailed++;
          } else if (status === 'skipped') {
            featureSkipped++;
          } else {
            featurePassed++;
          }
          
          await db.query(
            `INSERT INTO scenarios
             (feature_id, scenario_name, scenario_type, status, duration,
              error_message, stack_trace, tags)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              featureId,
              scenario.scenarioName,
              'scenario',
              status,
              duration,
              errorMessage,
              stackTrace,
              scenario.tags
            ]
          );
        }
        
        // Update feature stats
        await db.query(
          `UPDATE features
           SET passed_scenarios = $1, failed_scenarios = $2, skipped_scenarios = $3,
               duration = $4, status = $5
           WHERE id = $6`,
          [
            featurePassed,
            featureFailed,
            featureSkipped,
            featureDuration,
            featureFailed > 0 ? 'failed' : 'passed',
            featureId
          ]
        );
        
        totalScenarios += featureScenarios.length;
        passedScenarios += featurePassed;
        failedScenarios += featureFailed;
        skippedScenarios += featureSkipped;
      }
      
      // Update execution stats
      const totalDuration = Math.floor(Math.random() * 600000) + 300000;
      await db.query(
        `UPDATE test_executions
         SET total_scenarios = $1, passed_scenarios = $2, failed_scenarios = $3,
             skipped_scenarios = $4, total_duration = $5, status = $6
         WHERE id = $7`,
        [
          totalScenarios,
          passedScenarios,
          failedScenarios,
          skippedScenarios,
          totalDuration,
          failedScenarios > 0 ? 'failed' : 'passed',
          executionId
        ]
      );
      
      console.log(`Generated execution ${buildNumber} for ${environment} on ${executionDate.toISOString().split('T')[0]} (${passedScenarios}/${totalScenarios} passed)`);
    }
  }
}

function generateGitCommit() {
  const chars = '0123456789abcdef';
  let commit = '';
  for (let i = 0; i < 40; i++) {
    commit += chars[Math.floor(Math.random() * chars.length)];
  }
  return commit;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getRandomError() {
  const errors = [
    'AssertionError: Expected 200 but got 500',
    'TimeoutError: Element not found within 30 seconds',
    'ConnectionError: Unable to connect to database',
    'ValidationError: Required field is missing',
    'RuntimeException: Failed to sync: max retry attempts reached',
    'NullPointerException: Object reference not set'
  ];
  return errors[Math.floor(Math.random() * errors.length)];
}

// Run the import
importCucumberReport();

// Made with Bob
