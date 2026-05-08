import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  RemoveCircle as SkipIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalExecutions: 0,
    totalPassed: 0,
    totalFailed: 0,
    totalSkipped: 0,
    avgPassRate: 0,
  });
  const [trends, setTrends] = useState([]);
  const [recentExecutions, setRecentExecutions] = useState([]);
  const [topFailures, setTopFailures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent executions
      const executionsRes = await axios.get('/api/executions', { params: { limit: 10 } });
      setRecentExecutions(executionsRes.data.executions);

      // Calculate stats
      const executions = executionsRes.data.executions;
      const totalPassed = executions.reduce((sum, e) => sum + e.passed_scenarios, 0);
      const totalFailed = executions.reduce((sum, e) => sum + e.failed_scenarios, 0);
      const totalSkipped = executions.reduce((sum, e) => sum + e.skipped_scenarios, 0);
      const avgPassRate = executions.length > 0
        ? executions.reduce((sum, e) => sum + (e.passed_scenarios / e.total_scenarios * 100), 0) / executions.length
        : 0;

      setStats({
        totalExecutions: executions.length,
        totalPassed,
        totalFailed,
        totalSkipped,
        avgPassRate: avgPassRate.toFixed(2),
      });

      // Fetch trends
      const trendsRes = await axios.get('/api/analytics/trends', { params: { days: 14 } });
      const formattedTrends = trendsRes.data.trends.map(t => ({
        date: format(parseISO(t.date), 'MMM dd'),
        passRate: parseFloat(t.avg_pass_rate),
        failures: parseInt(t.failures),
      }));
      setTrends(formattedTrends);

      // Fetch top failures
      const failuresRes = await axios.get('/api/analytics/top-failures', { params: { days: 7, limit: 5 } });
      setTopFailures(failuresRes.data.topFailures);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Overview of test execution metrics and trends
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Executions
                  </Typography>
                  <Typography variant="h4">{stats.totalExecutions}</Typography>
                </Box>
                <TrendIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Passed Tests
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats.totalPassed}
                  </Typography>
                </Box>
                <PassIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Failed Tests
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {stats.totalFailed}
                  </Typography>
                </Box>
                <FailIcon sx={{ fontSize: 40, color: 'error.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Avg Pass Rate
                  </Typography>
                  <Typography variant="h4">{stats.avgPassRate}%</Typography>
                </Box>
                <SkipIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Trends Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pass Rate Trend (Last 14 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" label={{ value: 'Pass Rate (%)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Failures', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="passRate" stroke="#4caf50" name="Pass Rate %" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="failures" stroke="#f44336" name="Failures" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Failures */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Top Failures (Last 7 Days)
            </Typography>
            <Box>
              {topFailures.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No failures in the last 7 days
                </Typography>
              ) : (
                topFailures.map((failure, index) => (
                  <Box
                    key={index}
                    sx={{
                      mb: 2,
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold" noWrap>
                      {failure.scenario_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Feature: {failure.feature_name}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        label={`${failure.failure_count} failures`}
                        size="small"
                        color="error"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Last: {format(parseISO(failure.last_failed), 'MMM dd')}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Recent Executions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Executions
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Build</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Environment</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Date</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Total</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Passed</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Failed</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Pass Rate</th>
                    <th style={{ textAlign: 'center', padding: '12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExecutions.map((execution) => {
                    const passRate = (execution.passed_scenarios / execution.total_scenarios * 100).toFixed(1);
                    return (
                      <tr key={execution.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                        <td style={{ padding: '12px' }}>{execution.build_number}</td>
                        <td style={{ padding: '12px' }}>
                          <Chip label={execution.environment} size="small" />
                        </td>
                        <td style={{ padding: '12px' }}>
                          {format(parseISO(execution.execution_date), 'MMM dd, yyyy HH:mm')}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px' }}>{execution.total_scenarios}</td>
                        <td style={{ textAlign: 'center', padding: '12px', color: '#4caf50' }}>
                          {execution.passed_scenarios}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px', color: '#f44336' }}>
                          {execution.failed_scenarios}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px' }}>{passRate}%</td>
                        <td style={{ textAlign: 'center', padding: '12px' }}>
                          <Chip
                            label={execution.status}
                            size="small"
                            color={execution.status === 'passed' ? 'success' : 'error'}
                          />
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

export default Dashboard;

// Made with Bob
