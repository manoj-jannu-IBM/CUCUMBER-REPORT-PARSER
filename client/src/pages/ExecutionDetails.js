import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ExpandMore as ExpandIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  RemoveCircle as SkipIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const ExecutionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [execution, setExecution] = useState(null);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExecutionDetails();
  }, [id]);

  const fetchExecutionDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/executions/${id}`);
      setExecution(response.data.execution);
      setFeatures(response.data.features);
    } catch (error) {
      console.error('Error fetching execution details:', error);
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

  if (!execution) {
    return (
      <Box>
        <Typography variant="h5">Execution not found</Typography>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/executions')} sx={{ mt: 2 }}>
          Back to Executions
        </Button>
      </Box>
    );
  }

  const passRate = (execution.passed_scenarios / execution.total_scenarios * 100).toFixed(1);

  return (
    <Box>
      <Button startIcon={<BackIcon />} onClick={() => navigate('/executions')} sx={{ mb: 2 }}>
        Back to Executions
      </Button>

      <Typography variant="h4" gutterBottom>
        Execution Details
      </Typography>

      {/* Execution Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Build Number
            </Typography>
            <Typography variant="h6">{execution.build_number}</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Environment
            </Typography>
            <Chip label={execution.environment} color="primary" sx={{ mt: 0.5 }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Execution Date
            </Typography>
            <Typography variant="body1">
              {format(parseISO(execution.execution_date), 'MMMM dd, yyyy HH:mm:ss')}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="text.secondary">
              Status
            </Typography>
            <Chip
              label={execution.status}
              color={execution.status === 'passed' ? 'success' : 'error'}
              sx={{ mt: 0.5 }}
            />
          </Grid>
          {execution.git_commit && (
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Git Commit
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                {execution.git_commit.substring(0, 8)}
              </Typography>
            </Grid>
          )}
          {execution.git_branch && (
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Git Branch
              </Typography>
              <Typography variant="body1">{execution.git_branch}</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" variant="body2">
                Total Scenarios
              </Typography>
              <Typography variant="h4">{execution.total_scenarios}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <PassIcon sx={{ color: 'success.dark' }} />
                <Typography color="success.dark" variant="body2">
                  Passed
                </Typography>
              </Box>
              <Typography variant="h4" color="success.dark">
                {execution.passed_scenarios}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'error.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <FailIcon sx={{ color: 'error.dark' }} />
                <Typography color="error.dark" variant="body2">
                  Failed
                </Typography>
              </Box>
              <Typography variant="h4" color="error.dark">
                {execution.failed_scenarios}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <SkipIcon sx={{ color: 'warning.dark' }} />
                <Typography color="warning.dark" variant="body2">
                  Skipped
                </Typography>
              </Box>
              <Typography variant="h4" color="warning.dark">
                {execution.skipped_scenarios}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pass Rate */}
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Pass Rate
        </Typography>
        <Typography variant="h2" color={passRate >= 90 ? 'success.main' : passRate >= 70 ? 'warning.main' : 'error.main'}>
          {passRate}%
        </Typography>
      </Paper>

      {/* Features */}
      <Typography variant="h5" gutterBottom>
        Features
      </Typography>
      <Box>
        {features.map((feature, index) => {
          const featurePassRate = (feature.passed_scenarios / feature.total_scenarios * 100).toFixed(1);
          return (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Typography sx={{ flex: 1 }}>{feature.feature_name}</Typography>
                  <Chip
                    label={`${featurePassRate}%`}
                    size="small"
                    color={featurePassRate >= 90 ? 'success' : featurePassRate >= 70 ? 'warning' : 'error'}
                  />
                  <Chip
                    label={feature.status}
                    size="small"
                    color={feature.status === 'passed' ? 'success' : 'error'}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Total Scenarios
                    </Typography>
                    <Typography variant="h6">{feature.total_scenarios}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="success.main">
                      Passed
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {feature.passed_scenarios}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="error.main">
                      Failed
                    </Typography>
                    <Typography variant="h6" color="error.main">
                      {feature.failed_scenarios}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="warning.main">
                      Skipped
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {feature.skipped_scenarios}
                    </Typography>
                  </Grid>
                  {feature.duration && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Duration: {Math.floor(feature.duration / 60000)}m {Math.floor((feature.duration % 60000) / 1000)}s
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
};

export default ExecutionDetails;

// Made with Bob
