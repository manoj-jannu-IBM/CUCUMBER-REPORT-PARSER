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
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { 
  Search as SearchIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const TestCycles = () => {
  const [cycles, setCycles] = useState([]);
  const [filteredCycles, setFilteredCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchTestCycles();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchTestCycles, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Filter cycles based on search term
    if (searchTerm) {
      const filtered = cycles.filter(cycle =>
        cycle.testCycleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cycle.product.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCycles(filtered);
    } else {
      setFilteredCycles(cycles);
    }
  }, [searchTerm, cycles]);

  const fetchTestCycles = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      const response = await axios.get('/api/external/test-cycles');
      
      if (response.data.status === 'SUCCESS' && response.data.getMyCloudTaskOutput) {
        const results = response.data.getMyCloudTaskOutput.results || [];
        setCycles(results);
        setFilteredCycles(results);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching test cycles:', error);
      // For development, you can use mock data
      // setCycles(mockData);
      // setFilteredCycles(mockData);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'INPROGRESS':
        return 'primary';
      case 'BLOCKED':
        return 'error';
      case 'SUCCESS':
        return 'success';
      default:
        return 'default';
    }
  };

  const getProductStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
        return 'success';
      case 'BLOCKER':
        return 'error';
      case 'INPROGRESS':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading && cycles.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Test Cycles Monitor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time test cycle status from external API
            {lastUpdated && ` • Last updated: ${format(lastUpdated, 'HH:mm:ss')}`}
          </Typography>
        </Box>
        <IconButton onClick={fetchTestCycles} disabled={loading} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Search Box */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by test cycle number or product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
        />
        {searchTerm && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Found {filteredCycles.length} cycle(s) matching "{searchTerm}"
          </Typography>
        )}
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell><strong>Test Cycle Number</strong></TableCell>
              <TableCell><strong>Product</strong></TableCell>
              <TableCell><strong>Expected End Time</strong></TableCell>
              <TableCell align="center"><strong>Cycle Status</strong></TableCell>
              <TableCell align="center"><strong>Product Status</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCycles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                    {searchTerm ? 'No cycles found matching your search' : 'No test cycles found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredCycles.map((cycle, index) => (
                <TableRow
                  key={`${cycle.testCycleNumber}-${cycle.product}-${index}`}
                  hover
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' },
                    bgcolor: cycle.CycleStatus === 'BLOCKED' ? 'error.light' : 'inherit'
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {cycle.testCycleNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {cycle.product}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {cycle.expectedEndTime ? (
                      <Typography variant="body2">
                        {format(parseISO(cycle.expectedEndTime), 'MMM dd, yyyy HH:mm')}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={cycle.CycleStatus || 'UNKNOWN'}
                      size="small"
                      color={getStatusColor(cycle.CycleStatus)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={cycle.productStatus || 'UNKNOWN'}
                      size="small"
                      color={getProductStatusColor(cycle.productStatus)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredCycles.length > 0 && (
        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Showing {filteredCycles.length} of {cycles.length} test cycle(s) • Auto-refreshes every 2 minutes
          </Typography>
          <Box display="flex" gap={2}>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Chip size="small" color="primary" label="In Progress" />
              <Typography variant="body2">
                {cycles.filter(c => c.CycleStatus === 'INPROGRESS').length}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Chip size="small" color="error" label="Blocked" />
              <Typography variant="body2">
                {cycles.filter(c => c.CycleStatus === 'BLOCKED').length}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default TestCycles;

// Made with Bob
