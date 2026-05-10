const db = require('../config/database');

/**
 * Generate sample test data for demonstration
 */
async function generateSampleData() {
  console.log('Generating sample test data...');

  try {
    // Sample environments
    const environments = ['Preprod', 'Prod', 'Stage', 'Dev'];
    
    // Sample cycle names
    const cycleNames = [
      'Sprint-24.1', 'Sprint-24.2', 'Sprint-24.3', 'Sprint-24.4',
      'Release-2024.Q1', 'Release-2024.Q2',
      'Hotfix-123', 'Hotfix-456',
      'Regression-Suite', 'Smoke-Tests',
      'Daily-Run', 'Nightly-Build'
    ];
    
    // Sample features
    const features = [
      'User Authentication',
      'Shopping Cart',
      'Payment Processing',
      'Product Search',
      'Order Management',
      'User Profile',
      'Inventory Management',
      'Reporting Dashboard',
    ];

    // Sample scenarios for each feature
    const scenarioTemplates = [
      'User can login with valid credentials',
      'User cannot login with invalid credentials',
      'User can logout successfully',
      'User can add items to cart',
      'User can remove items from cart',
      'User can checkout successfully',
      'User can view order history',
      'User can update profile information',
      'System validates required fields',
      'System handles errors gracefully',
    ];

    // Generate 30 days of test executions
    const daysToGenerate = 30;
    const today = new Date();

    for (let day = 0; day < daysToGenerate; day++) {
      const executionDate = new Date(today);
      executionDate.setDate(today.getDate() - day);

      // Generate 1-3 executions per day
      const executionsPerDay = Math.floor(Math.random() * 3) + 1;

      for (let exec = 0; exec < executionsPerDay; exec++) {
        const environment = environments[Math.floor(Math.random() * environments.length)];
        const buildNumber = `BUILD-${1000 + day * 10 + exec}`;
        // Make cycle name unique by appending day and exec to avoid constraint violations
        const baseCycleName = cycleNames[Math.floor(Math.random() * cycleNames.length)];
        const cycleName = `${baseCycleName}-${day}-${exec}`;
        
        // Calculate pass rate (higher for recent builds, some variation)
        const basePassRate = 0.85 + (day / daysToGenerate) * 0.1;
        const passRate = Math.max(0.6, Math.min(0.98, basePassRate + (Math.random() - 0.5) * 0.2));

        // Generate scenarios
        const totalScenarios = Math.floor(Math.random() * 30) + 20;
        const passedScenarios = Math.floor(totalScenarios * passRate);
        const failedScenarios = Math.floor((totalScenarios - passedScenarios) * 0.8);
        const skippedScenarios = totalScenarios - passedScenarios - failedScenarios;

        // Insert execution
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
            totalScenarios,
            passedScenarios,
            failedScenarios,
            skippedScenarios,
            Math.floor(Math.random() * 600000) + 300000, // 5-15 minutes
            failedScenarios > 0 ? 'failed' : 'passed',
            JSON.stringify({ executor: 'Jenkins', node: 'node-1' }),
          ]
        );

        const executionId = executionResult.rows[0].id;

        // Generate features for this execution
        const numFeatures = Math.floor(Math.random() * 4) + 4;
        for (let f = 0; f < numFeatures; f++) {
          const featureName = features[f % features.length];
          const featureScenarios = Math.floor(totalScenarios / numFeatures);
          const featurePassed = Math.floor(featureScenarios * (passRate + (Math.random() - 0.5) * 0.1));
          const featureFailed = Math.floor((featureScenarios - featurePassed) * 0.8);
          const featureSkipped = featureScenarios - featurePassed - featureFailed;

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
              featureScenarios,
              featurePassed,
              featureFailed,
              featureSkipped,
              Math.floor(Math.random() * 120000) + 30000,
              featureFailed > 0 ? 'failed' : 'passed',
            ]
          );

          const featureId = featureResult.rows[0].id;

          // Generate scenarios for this feature
          for (let s = 0; s < featureScenarios; s++) {
            const scenarioName = scenarioTemplates[s % scenarioTemplates.length];
            const scenarioStatus = s < featurePassed ? 'passed' : s < featurePassed + featureFailed ? 'failed' : 'skipped';
            
            let errorMessage = null;
            let stackTrace = null;
            
            if (scenarioStatus === 'failed') {
              const errors = [
                'AssertionError: Expected 200 but got 500',
                'TimeoutError: Element not found within 30 seconds',
                'ConnectionError: Unable to connect to database',
                'ValidationError: Required field is missing',
                'NullPointerException: Object reference not set',
              ];
              errorMessage = errors[Math.floor(Math.random() * errors.length)];
              stackTrace = `${errorMessage}\n  at TestStep.execute(test.js:${Math.floor(Math.random() * 100) + 1})\n  at Runner.run(runner.js:45)`;
            }

            const scenarioResult = await db.query(
              `INSERT INTO scenarios 
               (feature_id, scenario_name, scenario_type, status, duration, 
                error_message, stack_trace, tags)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               RETURNING *`,
              [
                featureId,
                scenarioName,
                'scenario',
                scenarioStatus,
                Math.floor(Math.random() * 10000) + 1000,
                errorMessage,
                stackTrace,
                ['@smoke', '@regression'],
              ]
            );

            const scenarioId = scenarioResult.rows[0].id;

            // Generate steps for failed scenarios
            if (scenarioStatus === 'failed') {
              const steps = [
                { keyword: 'Given', name: 'user is on login page', status: 'passed' },
                { keyword: 'When', name: 'user enters credentials', status: 'passed' },
                { keyword: 'And', name: 'user clicks login button', status: 'failed' },
                { keyword: 'Then', name: 'user should see dashboard', status: 'skipped' },
              ];

              for (const step of steps) {
                await db.query(
                  `INSERT INTO steps 
                   (scenario_id, step_keyword, step_name, status, duration, error_message)
                   VALUES ($1, $2, $3, $4, $5, $6)`,
                  [
                    scenarioId,
                    step.keyword,
                    step.name,
                    step.status,
                    Math.floor(Math.random() * 2000) + 100,
                    step.status === 'failed' ? errorMessage : null,
                  ]
                );
              }
            }
          }
        }

        console.log(`Generated execution ${buildNumber} (${cycleName}) for ${environment} on ${executionDate.toISOString().split('T')[0]}`);
      }
    }

    // Generate some flaky tests
    console.log('Generating flaky test data...');
    const flakyScenarios = [
      'User can login with valid credentials',
      'System validates required fields',
      'User can checkout successfully',
    ];

    for (const scenario of flakyScenarios) {
      await db.query(
        `INSERT INTO flaky_tests 
         (scenario_name, feature_name, flaky_score, pass_count, fail_count, 
          last_passed, last_failed, first_detected)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          scenario,
          'User Authentication',
          Math.random() * 0.5 + 0.3, // 0.3 to 0.8
          Math.floor(Math.random() * 20) + 10,
          Math.floor(Math.random() * 15) + 5,
          new Date(),
          new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        ]
      );
    }

    // Generate some Jira defects
    console.log('Generating sample Jira defects...');
    const jiraDefects = [
      {
        key: 'TEST-101',
        summary: 'Login fails with timeout error',
        description: 'Users experiencing timeout when logging in during peak hours',
        status: 'Open',
        priority: 'High',
      },
      {
        key: 'TEST-102',
        summary: 'Cart items disappear after page refresh',
        description: 'Shopping cart items are not persisted correctly',
        status: 'In Progress',
        priority: 'Medium',
      },
      {
        key: 'TEST-103',
        summary: 'Payment processing fails intermittently',
        description: 'Payment gateway returns 500 error randomly',
        status: 'Resolved',
        priority: 'Critical',
      },
    ];

    for (const defect of jiraDefects) {
      await db.query(
        `INSERT INTO jira_defects 
         (jira_key, summary, description, status, priority, assignee, created_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (jira_key) DO NOTHING`,
        [
          defect.key,
          defect.summary,
          defect.description,
          defect.status,
          defect.priority,
          'John Doe',
          new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        ]
      );
    }

    console.log('✅ Sample data generation completed successfully!');
    console.log(`Generated ${daysToGenerate} days of test execution data`);
    console.log('You can now access the dashboard at http://localhost:3000');
    
  } catch (error) {
    console.error('Error generating sample data:', error);
    throw error;
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

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      await db.initializeDatabase();
      await generateSampleData();
      process.exit(0);
    } catch (error) {
      console.error('Failed to generate sample data:', error);
      process.exit(1);
    }
  })();
}

module.exports = { generateSampleData };

// Made with Bob
