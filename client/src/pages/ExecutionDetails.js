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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  ExpandMore as ExpandIcon,
  CheckCircle as PassIcon,
  Cancel as FailIcon,
  RemoveCircle as SkipIcon,
  Psychology as AIIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const ExecutionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [execution, setExecution] = useState(null);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState({});
  const [loadingAnalysis, setLoadingAnalysis] = useState({});
  const [expandedAI, setExpandedAI] = useState({});
  const [statusFilter, setStatusFilter] = useState(['passed', 'failed', 'skipped']);
  const [failureFrequency, setFailureFrequency] = useState({});
  const [loadingFrequency, setLoadingFrequency] = useState({});

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

  const fetchAIAnalysis = async (scenarioId) => {
    if (aiAnalysis[scenarioId] || loadingAnalysis[scenarioId]) return;
    
    try {
      setLoadingAnalysis(prev => ({ ...prev, [scenarioId]: true }));
      const response = await axios.get(`/api/analysis/${scenarioId}`);
      setAiAnalysis(prev => ({ ...prev, [scenarioId]: response.data.analysis }));
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      setAiAnalysis(prev => ({ ...prev, [scenarioId]: null }));
    } finally {
      setLoadingAnalysis(prev => ({ ...prev, [scenarioId]: false }));
    }
  };

  const fetchFailureFrequency = async (scenarioName) => {
    if (failureFrequency[scenarioName] || loadingFrequency[scenarioName]) return;
    
    try {
      setLoadingFrequency(prev => ({ ...prev, [scenarioName]: true }));
      const response = await axios.get(`/api/scenarios/failure-frequency`, {
        params: { scenarioName }
      });
      setFailureFrequency(prev => ({ ...prev, [scenarioName]: response.data }));
    } catch (error) {
      console.error('Error fetching failure frequency:', error);
      setFailureFrequency(prev => ({ ...prev, [scenarioName]: null }));
    } finally {
      setLoadingFrequency(prev => ({ ...prev, [scenarioName]: false }));
    }
  };

  const handleStatusFilterChange = (event, newFilter) => {
    if (newFilter.length > 0) {
      setStatusFilter(newFilter);
    }
  };

  const filterScenarios = (scenarios) => {
    return scenarios.filter(scenario => statusFilter.includes(scenario.status));
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
          {execution.cycle_name && (
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                Cycle Name
              </Typography>
              <Chip
                label={execution.cycle_name}
                color="secondary"
                variant="outlined"
                icon={<span>🔄</span>}
                sx={{ mt: 0.5 }}
              />
            </Grid>
          )}
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
              Triggered By
            </Typography>
            <Chip
              label={execution.triggered_by || 'Unknown'}
              color="default"
              variant="outlined"
              icon={<span>👤</span>}
              sx={{ mt: 0.5 }}
            />
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

      {/* Status Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon />
            <Typography variant="body1" fontWeight="medium">
              Filter by Status:
            </Typography>
          </Box>
          <ToggleButtonGroup
            value={statusFilter}
            onChange={handleStatusFilterChange}
            aria-label="status filter"
            size="small"
          >
            <ToggleButton value="passed" aria-label="passed" sx={{ px: 2 }}>
              <PassIcon sx={{ mr: 0.5, fontSize: '1.2rem' }} color="success" />
              Passed
            </ToggleButton>
            <ToggleButton value="failed" aria-label="failed" sx={{ px: 2 }}>
              <FailIcon sx={{ mr: 0.5, fontSize: '1.2rem' }} color="error" />
              Failed
            </ToggleButton>
            <ToggleButton value="skipped" aria-label="skipped" sx={{ px: 2 }}>
              <SkipIcon sx={{ mr: 0.5, fontSize: '1.2rem' }} color="warning" />
              Skipped
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Showing {statusFilter.length} of 3 status types
          </Typography>
        </Box>
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

                {/* Scenarios List */}
                {feature.scenarios && feature.scenarios.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Scenarios ({filterScenarios(feature.scenarios).length} of {feature.scenarios.length})
                    </Typography>
                    <List>
                      {filterScenarios(feature.scenarios).map((scenario, idx) => {
                        const showAI = expandedAI[scenario.id] || false;
                        const analysis = aiAnalysis[scenario.id];
                        const isLoadingAI = loadingAnalysis[scenario.id];
                        const frequency = failureFrequency[scenario.scenario_name];
                        const isLoadingFreq = loadingFrequency[scenario.scenario_name];

                        return (
                          <Box key={idx} sx={{ mb: 2 }}>
                            <ListItem
                              sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                bgcolor: scenario.status === 'passed'
                                  ? 'success.lighter'
                                  : scenario.status === 'failed'
                                  ? 'error.lighter'
                                  : 'warning.lighter',
                              }}
                            >
                              <ListItemIcon>
                                {scenario.status === 'passed' && <PassIcon color="success" />}
                                {scenario.status === 'failed' && <FailIcon color="error" />}
                                {scenario.status === 'skipped' && <SkipIcon color="warning" />}
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography variant="body1" sx={{ flex: '1 1 auto', minWidth: '200px' }}>
                                      {scenario.scenario_name}
                                    </Typography>
                                    <Chip
                                      label={scenario.status}
                                      size="small"
                                      color={
                                        scenario.status === 'passed'
                                          ? 'success'
                                          : scenario.status === 'failed'
                                          ? 'error'
                                          : 'warning'
                                      }
                                    />
                                    {scenario.status === 'failed' && (
                                      <>
                                        <Tooltip title="View failure frequency across all executions">
                                          <Button
                                            size="small"
                                            startIcon={<TrendingIcon />}
                                            onClick={() => {
                                              if (!frequency && !isLoadingFreq) {
                                                fetchFailureFrequency(scenario.scenario_name);
                                              }
                                            }}
                                            variant="outlined"
                                            color="warning"
                                          >
                                            Frequency
                                          </Button>
                                        </Tooltip>
                                        <Button
                                          size="small"
                                          startIcon={<AIIcon />}
                                          onClick={() => {
                                            setExpandedAI(prev => ({
                                              ...prev,
                                              [scenario.id]: !prev[scenario.id]
                                            }));
                                            if (!showAI && !analysis && !isLoadingAI) {
                                              fetchAIAnalysis(scenario.id);
                                            }
                                          }}
                                        >
                                          AI Analysis
                                        </Button>
                                      </>
                                    )}
                                  </Box>
                                }
                                secondary={
                                  <Box sx={{ mt: 1 }}>
                                    {scenario.duration && (
                                      <Typography variant="caption" color="text.secondary">
                                        Duration: {Math.floor(scenario.duration / 1000)}s
                                      </Typography>
                                    )}
                                    {scenario.error_message && (
                                      <Typography
                                        variant="caption"
                                        color="error"
                                        sx={{ display: 'block', mt: 0.5 }}
                                      >
                                        Error: {scenario.error_message.substring(0, 200)}
                                        {scenario.error_message.length > 200 && '...'}
                                      </Typography>
                                    )}
                                    {scenario.tags && scenario.tags.length > 0 && (
                                      <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {scenario.tags.map((tag, tagIdx) => (
                                          <Chip
                                            key={tagIdx}
                                            label={tag}
                                            size="small"
                                            variant="outlined"
                                            sx={{ height: 20, fontSize: '0.7rem' }}
                                          />
                                        ))}
                                      </Box>
                                    )}
                                  </Box>
                                }
                              />
                            </ListItem>

                            {/* Failure Frequency Section */}
                            {scenario.status === 'failed' && frequency && (
                              <Box sx={{ mt: 1, ml: 7 }}>
                                <Alert
                                  severity={frequency.failure_rate > 0.5 ? 'error' : frequency.failure_rate > 0.2 ? 'warning' : 'info'}
                                  icon={<TrendingIcon />}
                                  sx={{ bgcolor: 'background.paper' }}
                                >
                                  <AlertTitle>
                                    <strong>Failure Frequency Analysis</strong>
                                    <Chip
                                      label={`${(frequency.failure_rate * 100).toFixed(1)}% failure rate`}
                                      size="small"
                                      color={frequency.failure_rate > 0.5 ? 'error' : frequency.failure_rate > 0.2 ? 'warning' : 'success'}
                                      sx={{ ml: 1 }}
                                    />
                                  </AlertTitle>
                                  <Grid container spacing={2} sx={{ mt: 1 }}>
                                    <Grid item xs={12} sm={4}>
                                      <Typography variant="caption" color="text.secondary">
                                        Total Executions
                                      </Typography>
                                      <Typography variant="h6">
                                        {frequency.total_executions}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                      <Typography variant="caption" color="text.secondary">
                                        Failed
                                      </Typography>
                                      <Typography variant="h6" color="error.main">
                                        {frequency.failed_count}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={4}>
                                      <Typography variant="caption" color="text.secondary">
                                        Passed
                                      </Typography>
                                      <Typography variant="h6" color="success.main">
                                        {frequency.passed_count}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={12}>
                                      <Typography variant="caption" color="text.secondary">
                                        Failure Rate Trend
                                      </Typography>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <LinearProgress
                                          variant="determinate"
                                          value={frequency.failure_rate * 100}
                                          sx={{
                                            flex: 1,
                                            height: 8,
                                            borderRadius: 1,
                                            bgcolor: 'grey.200',
                                            '& .MuiLinearProgress-bar': {
                                              bgcolor: frequency.failure_rate > 0.5 ? 'error.main' : frequency.failure_rate > 0.2 ? 'warning.main' : 'success.main'
                                            }
                                          }}
                                        />
                                        <Typography variant="body2" fontWeight="medium">
                                          {(frequency.failure_rate * 100).toFixed(1)}%
                                        </Typography>
                                      </Box>
                                    </Grid>
                                    {frequency.last_failed && (
                                      <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">
                                          Last Failed
                                        </Typography>
                                        <Typography variant="body2">
                                          {format(parseISO(frequency.last_failed), 'MMM dd, yyyy HH:mm')}
                                        </Typography>
                                      </Grid>
                                    )}
                                    {frequency.first_failed && (
                                      <Grid item xs={12}>
                                        <Typography variant="caption" color="text.secondary">
                                          First Failed
                                        </Typography>
                                        <Typography variant="body2">
                                          {format(parseISO(frequency.first_failed), 'MMM dd, yyyy HH:mm')}
                                        </Typography>
                                      </Grid>
                                    )}
                                    <Grid item xs={12}>
                                      <Divider sx={{ my: 1 }} />
                                      <Typography variant="body2" color="text.secondary">
                                        💡 <strong>AI Insight:</strong> {
                                          frequency.failure_rate > 0.7
                                            ? 'This test fails very frequently. Consider investigating the root cause or marking as flaky.'
                                            : frequency.failure_rate > 0.4
                                            ? 'This test has a moderate failure rate. It may be unstable or environment-dependent.'
                                            : frequency.failure_rate > 0.2
                                            ? 'This test occasionally fails. Monitor for patterns in failure conditions.'
                                            : 'This test rarely fails. This failure might be a new issue worth investigating.'
                                        }
                                      </Typography>
                                    </Grid>
                                  </Grid>
                                </Alert>
                              </Box>
                            )}
                            {scenario.status === 'failed' && isLoadingFreq && (
                              <Box sx={{ mt: 1, ml: 7, p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={20} />
                                <Typography variant="body2">Loading failure frequency...</Typography>
                              </Box>
                            )}

                            {/* AI Analysis Section */}
                            {scenario.status === 'failed' && (
                              <Collapse in={showAI}>
                                <Box sx={{ mt: 1, ml: 7 }}>
                                  {isLoadingAI && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2 }}>
                                      <CircularProgress size={20} />
                                      <Typography variant="body2">Analyzing with AI...</Typography>
                                    </Box>
                                  )}
                                  {analysis && (
                                    <Alert
                                      severity="info"
                                      icon={<AIIcon />}
                                      sx={{ bgcolor: 'background.paper' }}
                                    >
                                      <AlertTitle>
                                        <strong>AI Failure Analysis</strong>
                                        <Chip
                                          label={`${(analysis.confidence_score * 100).toFixed(0)}% confidence`}
                                          size="small"
                                          color="primary"
                                          sx={{ ml: 1 }}
                                        />
                                      </AlertTitle>
                                      <Grid container spacing={2} sx={{ mt: 1 }}>
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="caption" color="text.secondary">
                                            Failure Type
                                          </Typography>
                                          <Typography variant="body2">
                                            <strong>{analysis.failure_type}</strong>
                                          </Typography>
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                          <Typography variant="caption" color="text.secondary">
                                            Suggested Owner
                                          </Typography>
                                          <Typography variant="body2">
                                            <strong>{analysis.suggested_owner}</strong>
                                          </Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                          <Typography variant="caption" color="text.secondary">
                                            Root Cause
                                          </Typography>
                                          <Typography variant="body2">{analysis.root_cause}</Typography>
                                        </Grid>
                                        <Grid item xs={12}>
                                          <Typography variant="caption" color="text.secondary">
                                            AI Summary
                                          </Typography>
                                          <Typography variant="body2">{analysis.ai_summary}</Typography>
                                        </Grid>
                                        {analysis.is_flaky && (
                                          <Grid item xs={12}>
                                            <Chip
                                              label="⚠️ Flaky Test Detected"
                                              color="warning"
                                              size="small"
                                            />
                                          </Grid>
                                        )}
                                        {analysis.is_new_failure && (
                                          <Grid item xs={12}>
                                            <Chip
                                              label="🆕 New Failure Pattern"
                                              color="error"
                                              size="small"
                                            />
                                          </Grid>
                                        )}
                                      </Grid>
                                    </Alert>
                                  )}
                                  {!isLoadingAI && !analysis && showAI && (
                                    <Alert severity="warning">
                                      AI analysis not available. Make sure Ollama is running.
                                    </Alert>
                                  )}
                                </Box>
                              </Collapse>
                            )}
                          </Box>
                        );
                      })}
                    </List>
                  </Box>
                )}
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
