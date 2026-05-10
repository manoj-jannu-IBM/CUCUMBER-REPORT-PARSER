import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tooltip,
  Chip,
} from '@mui/material';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const Heatmap = () => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [environment, setEnvironment] = useState('all');
  const [environments, setEnvironments] = useState([]);

  useEffect(() => {
    fetchHeatmapData();
  }, [days, environment]);

  const fetchHeatmapData = async () => {
    try {
      setLoading(true);
      const params = { days };
      if (environment !== 'all') {
        params.environment = environment;
      }

      const response = await axios.get('/api/heatmap', { params });
      setHeatmapData(response.data.heatmapData);

      // Extract unique environments
      const uniqueEnvs = [...new Set(response.data.heatmapData.map(d => d.environment))];
      setEnvironments(uniqueEnvs);
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColorForPassRate = (passRate) => {
    if (passRate >= 95) return '#4caf50'; // Green
    if (passRate >= 80) return '#8bc34a'; // Light green
    if (passRate >= 60) return '#ffc107'; // Yellow
    if (passRate >= 40) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const getIntensity = (passRate) => {
    if (passRate >= 95) return 1;
    if (passRate >= 80) return 0.8;
    if (passRate >= 60) return 0.6;
    if (passRate >= 40) return 0.4;
    return 0.2;
  };

  // Group data by date and environment
  const groupedData = heatmapData.reduce((acc, item) => {
    const date = format(parseISO(item.date), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = {};
    }
    acc[date][item.environment] = item;
    return acc;
  }, {});

  const dates = Object.keys(groupedData).sort().reverse();
  const displayEnvs = environment === 'all' ? environments : [environment];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Test Execution Heatmap
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Visual representation of test pass rates across time and environments
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={days}
                label="Time Range"
                onChange={(e) => setDays(e.target.value)}
              >
                <MenuItem value={7}>Last 7 days</MenuItem>
                <MenuItem value={14}>Last 14 days</MenuItem>
                <MenuItem value={30}>Last 30 days</MenuItem>
                <MenuItem value={60}>Last 60 days</MenuItem>
                <MenuItem value={90}>Last 90 days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Environment</InputLabel>
              <Select
                value={environment}
                label="Environment"
                onChange={(e) => setEnvironment(e.target.value)}
              >
                <MenuItem value="all">All Environments</MenuItem>
                {environments.map((env) => (
                  <MenuItem key={env} value={env}>
                    {env}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" p={5}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 3, overflowX: 'auto' }}>
          <Box sx={{ minWidth: 800 }}>
            {/* Legend */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="body2" fontWeight="bold">
                Pass Rate:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label="95-100%"
                  size="small"
                  sx={{ bgcolor: '#4caf50', color: 'white' }}
                />
                <Chip
                  label="80-94%"
                  size="small"
                  sx={{ bgcolor: '#8bc34a', color: 'white' }}
                />
                <Chip
                  label="60-79%"
                  size="small"
                  sx={{ bgcolor: '#ffc107', color: 'black' }}
                />
                <Chip
                  label="40-59%"
                  size="small"
                  sx={{ bgcolor: '#ff9800', color: 'white' }}
                />
                <Chip
                  label="0-39%"
                  size="small"
                  sx={{ bgcolor: '#f44336', color: 'white' }}
                />
              </Box>
            </Box>

            {/* Heatmap Grid */}
            <Box>
              {/* Header Row */}
              <Box sx={{ display: 'flex', mb: 1 }}>
                <Box sx={{ width: 120, fontWeight: 'bold', fontSize: '0.875rem' }}>
                  Date
                </Box>
                {displayEnvs.map((env) => (
                  <Box
                    key={env}
                    sx={{
                      width: 150,
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      textAlign: 'center',
                    }}
                  >
                    {env}
                  </Box>
                ))}
              </Box>

              {/* Data Rows */}
              {dates.map((date) => (
                <Box key={date} sx={{ display: 'flex', mb: 0.5 }}>
                  <Box
                    sx={{
                      width: 120,
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {format(parseISO(date), 'MMM dd, yyyy')}
                  </Box>
                  {displayEnvs.map((env) => {
                    const data = groupedData[date]?.[env];
                    if (!data) {
                      return (
                        <Box
                          key={env}
                          sx={{
                            width: 150,
                            height: 60,
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                            mx: 0.5,
                            bgcolor: '#f5f5f5',
                          }}
                        />
                      );
                    }

                    const passRate = parseFloat(data.pass_rate);
                    const color = getColorForPassRate(passRate);

                    return (
                      <Tooltip
                        key={env}
                        title={
                          <Box>
                            <Typography variant="body2">
                              <strong>Date:</strong> {format(parseISO(date), 'MMM dd, yyyy')}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Environment:</strong> {env}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Pass Rate:</strong> {passRate.toFixed(2)}%
                            </Typography>
                            <Typography variant="body2">
                              <strong>Passed:</strong> {data.total_passed}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Failed:</strong> {data.total_failed}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Skipped:</strong> {data.total_skipped}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Executions:</strong> {data.total_executions}
                            </Typography>
                            {data.triggered_by_list && (
                              <Typography variant="body2">
                                <strong>Triggered By:</strong> {data.triggered_by_list}
                              </Typography>
                            )}
                          </Box>
                        }
                      >
                        <Box
                          sx={{
                            width: 150,
                            height: 60,
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                            mx: 0.5,
                            bgcolor: color,
                            opacity: getIntensity(passRate),
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              opacity: 1,
                              transform: 'scale(1.05)',
                              zIndex: 1,
                            },
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{ color: 'white', fontWeight: 'bold' }}
                          >
                            {passRate.toFixed(1)}%
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'white' }}>
                            {data.total_failed} failed
                          </Typography>
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              ))}
            </Box>

            {dates.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Typography variant="body1" color="text.secondary">
                  No data available for the selected time range
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default Heatmap;

// Made with Bob
