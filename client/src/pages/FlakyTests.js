import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const FlakyTests = () => {
  const [flakyTests, setFlakyTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlakyTests();
  }, []);

  const fetchFlakyTests = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/analytics/flaky-tests');
      setFlakyTests(response.data.flakyTests);
    } catch (error) {
      console.error('Error fetching flaky tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFlakyScoreColor = (score) => {
    if (score >= 0.7) return 'error';
    if (score >= 0.5) return 'warning';
    return 'info';
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
        Flaky Tests Detection
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Tests with inconsistent pass/fail behavior that may indicate instability
      </Typography>

      <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light' }}>
        <Typography variant="body2" color="info.dark">
          <strong>What are Flaky Tests?</strong> Tests that sometimes pass and sometimes fail without any code changes.
          They can indicate timing issues, race conditions, or environmental dependencies.
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell><strong>Scenario Name</strong></TableCell>
              <TableCell><strong>Feature</strong></TableCell>
              <TableCell align="center"><strong>Flaky Score</strong></TableCell>
              <TableCell align="center"><strong>Pass Count</strong></TableCell>
              <TableCell align="center"><strong>Fail Count</strong></TableCell>
              <TableCell align="center"><strong>Total Runs</strong></TableCell>
              <TableCell align="center"><strong>Pass Rate</strong></TableCell>
              <TableCell><strong>Last Passed</strong></TableCell>
              <TableCell><strong>Last Failed</strong></TableCell>
              <TableCell><strong>First Detected</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {flakyTests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Box sx={{ py: 5 }}>
                    <Typography variant="h6" color="success.main" gutterBottom>
                      🎉 No Flaky Tests Detected!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      All tests are showing consistent behavior
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              flakyTests.map((test, index) => {
                const totalRuns = test.pass_count + test.fail_count;
                const passRate = (test.pass_count / totalRuns * 100).toFixed(1);
                const flakyScorePercent = (test.flaky_score * 100).toFixed(0);

                return (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 300 }}>
                        {test.scenario_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {test.feature_name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box>
                        <Chip
                          label={`${flakyScorePercent}%`}
                          size="small"
                          color={getFlakyScoreColor(test.flaky_score)}
                        />
                        <LinearProgress
                          variant="determinate"
                          value={test.flaky_score * 100}
                          color={getFlakyScoreColor(test.flaky_score)}
                          sx={{ mt: 1, height: 6, borderRadius: 1 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={test.pass_count}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={test.fail_count}
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <strong>{totalRuns}</strong>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${passRate}%`}
                        size="small"
                        color={passRate >= 70 ? 'success' : passRate >= 50 ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      {test.last_passed ? (
                        <Typography variant="caption">
                          {format(parseISO(test.last_passed), 'MMM dd, yyyy')}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Never
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {test.last_failed ? (
                        <Typography variant="caption">
                          {format(parseISO(test.last_failed), 'MMM dd, yyyy')}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Never
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {format(parseISO(test.first_detected), 'MMM dd, yyyy')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {flakyTests.length > 0 && (
        <Paper sx={{ p: 2, mt: 3, bgcolor: 'warning.light' }}>
          <Typography variant="body2" color="warning.dark">
            <strong>Recommendation:</strong> Flaky tests should be investigated and fixed to improve test suite reliability.
            Consider adding explicit waits, improving test isolation, or checking for race conditions.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default FlakyTests;

// Made with Bob
