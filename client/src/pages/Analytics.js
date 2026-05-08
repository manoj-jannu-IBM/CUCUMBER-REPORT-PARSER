import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import axios from 'axios';

const COLORS = ['#4caf50', '#f44336', '#ff9800', '#2196f3', '#9c27b0'];

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [flakyTests, setFlakyTests] = useState([]);
  const [topFailures, setTopFailures] = useState([]);
  const [environmentStats, setEnvironmentStats] = useState([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch flaky tests
      const flakyRes = await axios.get('/api/analytics/flaky-tests');
      setFlakyTests(flakyRes.data.flakyTests);

      // Fetch top failures
      const failuresRes = await axios.get('/api/analytics/top-failures', {
        params: { days: 30, limit: 10 },
      });
      setTopFailures(failuresRes.data.topFailures);

      // Fetch executions for environment stats
      const executionsRes = await axios.get('/api/executions', { params: { limit: 100 } });
      const executions = executionsRes.data.executions;

      // Calculate environment-wise stats
      const envStats = {};
      executions.forEach((exec) => {
        if (!envStats[exec.environment]) {
          envStats[exec.environment] = {
            environment: exec.environment,
            total: 0,
            passed: 0,
            failed: 0,
          };
        }
        envStats[exec.environment].total += exec.total_scenarios;
        envStats[exec.environment].passed += exec.passed_scenarios;
        envStats[exec.environment].failed += exec.failed_scenarios;
      });

      setEnvironmentStats(Object.values(envStats));
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Advanced Analytics
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Deep insights into test failures, flaky tests, and environment performance
      </Typography>

      <Grid container spacing={3}>
        {/* Environment Performance */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Environment Performance
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={environmentStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="environment" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="passed" fill="#4caf50" name="Passed" />
                <Bar dataKey="failed" fill="#f44336" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Pass/Fail Distribution */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Overall Pass/Fail Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: 'Passed',
                      value: environmentStats.reduce((sum, env) => sum + env.passed, 0),
                    },
                    {
                      name: 'Failed',
                      value: environmentStats.reduce((sum, env) => sum + env.failed, 0),
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#4caf50" />
                  <Cell fill="#f44336" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Flaky Tests */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Flaky Tests Detection
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Tests with inconsistent pass/fail behavior
            </Typography>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {flakyTests.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No flaky tests detected
                </Typography>
              ) : (
                flakyTests.map((test, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="body1" fontWeight="bold" noWrap>
                        {test.scenario_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Feature: {test.feature_name}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`Flaky Score: ${(test.flaky_score * 100).toFixed(0)}%`}
                          size="small"
                          color="warning"
                        />
                        <Chip
                          label={`${test.pass_count} passes`}
                          size="small"
                          color="success"
                        />
                        <Chip
                          label={`${test.fail_count} failures`}
                          size="small"
                          color="error"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Top Failures */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Most Frequent Failures (Last 30 Days)
            </Typography>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {topFailures.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No failures in the last 30 days
                </Typography>
              ) : (
                topFailures.map((failure, index) => (
                  <Card key={index} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight="bold">
                            {failure.scenario_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Feature: {failure.feature_name}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${failure.failure_count} failures`}
                          color="error"
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Environment Stats Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Environment Statistics
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Environment</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Total Tests</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Passed</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Failed</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Pass Rate</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Health</th>
                  </tr>
                </thead>
                <tbody>
                  {environmentStats.map((env, index) => {
                    const passRate = (env.passed / env.total * 100).toFixed(1);
                    const health = passRate >= 90 ? 'Excellent' : passRate >= 75 ? 'Good' : passRate >= 60 ? 'Fair' : 'Poor';
                    const healthColor = passRate >= 90 ? 'success' : passRate >= 75 ? 'primary' : passRate >= 60 ? 'warning' : 'error';

                    return (
                      <tr key={index} style={{ borderBottom: '1px solid #e0e0e0' }}>
                        <td style={{ padding: '12px' }}>
                          <Chip label={env.environment} size="small" />
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px' }}>{env.total}</td>
                        <td style={{ textAlign: 'center', padding: '12px', color: '#4caf50' }}>
                          {env.passed}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px', color: '#f44336' }}>
                          {env.failed}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px' }}>
                          <strong>{passRate}%</strong>
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px' }}>
                          <Chip label={health} size="small" color={healthColor} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;

// Made with Bob
