import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  TableSortLabel,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const Executions = () => {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [orderBy, setOrderBy] = useState('execution_date');
  const [order, setOrder] = useState('desc');
  const navigate = useNavigate();

  useEffect(() => {
    fetchExecutions();
  }, []);

  const fetchExecutions = async (cycleName = '') => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (cycleName) {
        params.cycleName = cycleName;
      }
      const response = await axios.get('/api/executions', { params });
      setExecutions(response.data.executions);
    } catch (error) {
      console.error('Error fetching executions:', error);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  // Debounced search function
  const debounceTimeout = React.useRef(null);
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setSearching(true);
    
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    debounceTimeout.current = setTimeout(() => {
      fetchExecutions(value);
    }, 500); // 500ms delay
  }, []);

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearching(false);
    fetchExecutions('');
  };

  const handleViewDetails = (executionId) => {
    navigate(`/executions/${executionId}`);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedExecutions = React.useMemo(() => {
    const comparator = (a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];

      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';

      // Handle numeric comparisons
      if (orderBy === 'total_scenarios' || orderBy === 'passed_scenarios' ||
          orderBy === 'failed_scenarios' || orderBy === 'skipped_scenarios' ||
          orderBy === 'total_duration') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }

      // Handle date comparisons
      if (orderBy === 'execution_date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle pass rate calculation
      if (orderBy === 'pass_rate') {
        aValue = (a.passed_scenarios / a.total_scenarios) || 0;
        bValue = (b.passed_scenarios / b.total_scenarios) || 0;
      }

      if (bValue < aValue) {
        return order === 'asc' ? 1 : -1;
      }
      if (bValue > aValue) {
        return order === 'asc' ? -1 : 1;
      }
      return 0;
    };

    return [...executions].sort(comparator);
  }, [executions, order, orderBy]);

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
        Test Executions
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Complete history of test execution runs
      </Typography>

      {/* Search Box */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by cycle name..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          disabled={loading}
        />
        {searching && (
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Searching...
            </Typography>
          </Box>
        )}
        {!searching && searchTerm && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Found {executions.length} execution(s) matching "{searchTerm}"
          </Typography>
        )}
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'build_number'}
                  direction={orderBy === 'build_number' ? order : 'asc'}
                  onClick={() => handleSort('build_number')}
                >
                  <strong>Build Number</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'cycle_name'}
                  direction={orderBy === 'cycle_name' ? order : 'asc'}
                  onClick={() => handleSort('cycle_name')}
                >
                  <strong>Cycle Name</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'environment'}
                  direction={orderBy === 'environment' ? order : 'asc'}
                  onClick={() => handleSort('environment')}
                >
                  <strong>Environment</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'triggered_by'}
                  direction={orderBy === 'triggered_by' ? order : 'asc'}
                  onClick={() => handleSort('triggered_by')}
                >
                  <strong>Triggered By</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'execution_date'}
                  direction={orderBy === 'execution_date' ? order : 'asc'}
                  onClick={() => handleSort('execution_date')}
                >
                  <strong>Date</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'total_scenarios'}
                  direction={orderBy === 'total_scenarios' ? order : 'asc'}
                  onClick={() => handleSort('total_scenarios')}
                >
                  <strong>Total</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'passed_scenarios'}
                  direction={orderBy === 'passed_scenarios' ? order : 'asc'}
                  onClick={() => handleSort('passed_scenarios')}
                >
                  <strong>Passed</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'failed_scenarios'}
                  direction={orderBy === 'failed_scenarios' ? order : 'asc'}
                  onClick={() => handleSort('failed_scenarios')}
                >
                  <strong>Failed</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'skipped_scenarios'}
                  direction={orderBy === 'skipped_scenarios' ? order : 'asc'}
                  onClick={() => handleSort('skipped_scenarios')}
                >
                  <strong>Skipped</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'pass_rate'}
                  direction={orderBy === 'pass_rate' ? order : 'asc'}
                  onClick={() => handleSort('pass_rate')}
                >
                  <strong>Pass Rate</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'total_duration'}
                  direction={orderBy === 'total_duration' ? order : 'asc'}
                  onClick={() => handleSort('total_duration')}
                >
                  <strong>Duration</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  <strong>Status</strong>
                </TableSortLabel>
              </TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {executions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    No executions found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedExecutions.map((execution) => {
                const passRate = (execution.passed_scenarios / execution.total_scenarios * 100).toFixed(1);
                const duration = execution.total_duration
                  ? `${Math.floor(execution.total_duration / 60000)}m ${Math.floor((execution.total_duration % 60000) / 1000)}s`
                  : 'N/A';

                return (
                  <TableRow
                    key={execution.id}
                    hover
                    sx={{ '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' } }}
                    onClick={() => handleViewDetails(execution.id)}
                  >
                    <TableCell>{execution.build_number}</TableCell>
                    <TableCell>
                      {execution.cycle_name ? (
                        <Chip
                          label={execution.cycle_name}
                          size="small"
                          color="secondary"
                          variant="outlined"
                          icon={<span>🔄</span>}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={execution.environment} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={execution.triggered_by || 'Unknown'}
                        size="small"
                        color="default"
                        variant="outlined"
                        icon={<span>👤</span>}
                      />
                    </TableCell>
                    <TableCell>
                      {format(parseISO(execution.execution_date), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell align="center">{execution.total_scenarios}</TableCell>
                    <TableCell align="center" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                      {execution.passed_scenarios}
                    </TableCell>
                    <TableCell align="center" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                      {execution.failed_scenarios}
                    </TableCell>
                    <TableCell align="center" sx={{ color: 'warning.main' }}>
                      {execution.skipped_scenarios}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${passRate}%`}
                        size="small"
                        color={passRate >= 90 ? 'success' : passRate >= 70 ? 'warning' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="center">{duration}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={execution.status}
                        size="small"
                        color={execution.status === 'passed' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(execution.id);
                          }}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Executions;

// Made with Bob
