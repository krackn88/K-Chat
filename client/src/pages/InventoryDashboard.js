import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import WarningIcon from '@mui/icons-material/Warning';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import AuthContext from '../context/auth/authContext';

const InventoryDashboard = () => {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [automationStatus, setAutomationStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [configId, setConfigId] = useState('');
  const [targetCount, setTargetCount] = useState(100);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    // Check if user is admin or seller
    if (authContext.user && !(authContext.user.isAdmin || authContext.user.isSeller)) {
      navigate('/');
    }

    loadDashboardData();
  }, [authContext.user, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load products
      const productsRes = await axios.get('/api/marketplace/products');
      setProducts(productsRes.data.products || []);
      
      // Load low stock products
      const lowStockRes = await axios.get('/api/openbullet/inventory/low');
      setLowStockProducts(lowStockRes.data || []);
      
      // Load automation status
      const automationRes = await axios.get('/api/openbullet/automation/status');
      setAutomationStatus(automationRes.data || {});
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleOpenDialog = (type, product = null) => {
    setDialogType(type);
    setSelectedProduct(product);
    setConfigId('');
    setTargetCount(100);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleStartAutomation = async () => {
    try {
      setLoading(true);
      
      const res = await axios.post('/api/openbullet/automation/start');
      
      setAutomationStatus(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Error starting automation');
    } finally {
      setLoading(false);
    }
  };

  const handleStopAutomation = async () => {
    try {
      setLoading(true);
      
      const res = await axios.post('/api/openbullet/automation/stop');
      
      setAutomationStatus({});
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Error stopping automation');
    } finally {
      setLoading(false);
    }
  };

  const handleGetNewInventory = async () => {
    if (!selectedProduct || !configId) return;
    
    try {
      setLoading(true);
      
      const res = await axios.post(`/api/openbullet/inventory/${selectedProduct._id}`, {
        configId,
        targetCount
      });
      
      handleDialogClose();
      loadDashboardData();
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Error getting new inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateInventory = async () => {
    if (!selectedProduct || !configId) return;
    
    try {
      setLoading(true);
      
      const res = await axios.post(`/api/openbullet/validate/${selectedProduct._id}`, {
        configId
      });
      
      handleDialogClose();
      loadDashboardData();
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Error validating inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUploadInventory = async () => {
    if (!selectedProduct || !selectedFile) return;
    
    try {
      setLoading(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Upload file
      const res = await axios.post(`/api/openbullet/upload/${selectedProduct._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      handleDialogClose();
      loadDashboardData();
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Error uploading inventory');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const renderStatusCircle = (count, threshold = 10) => {
    const color = count < threshold / 2 ? 'error' 
      : count < threshold ? 'warning' 
      : 'success';
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box 
          sx={{ 
            width: 12, 
            height: 12, 
            borderRadius: '50%', 
            bgcolor: `${color}.main`,
            mr: 1
          }} 
        />
        <Typography>{count}</Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Inventory Dashboard
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Automation Status
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={handleStartAutomation}
                disabled={loading || Object.keys(automationStatus).length > 0}
              >
                Start
              </Button>
              
              <Button
                variant="contained"
                color="secondary"
                startIcon={<StopIcon />}
                onClick={handleStopAutomation}
                disabled={loading || Object.keys(automationStatus).length === 0}
              >
                Stop
              </Button>
              
              <IconButton onClick={loadDashboardData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Box>
            
            {Object.keys(automationStatus).length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2">Active Jobs:</Typography>
                {automationStatus.activeJobs && Object.entries(automationStatus.activeJobs).map(([jobId, job]) => (
                  <Box key={jobId} sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>{jobId}:</strong> Next run at {new Date(job.nextInvocation).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Low Stock Products
            </Typography>
            
            {lowStockProducts.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                No products with low stock
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product ID</TableCell>
                      <TableCell>Stock</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowStockProducts.map((product) => (
                      <TableRow key={product.product_id}>
                        <TableCell>{product.product_id}</TableCell>
                        <TableCell>
                          {renderStatusCircle(product.available_items)}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => {
                              const prod = products.find(p => p._id === product.product_id);
                              handleOpenDialog('inventory', prod);
                            }}
                          >
                            <AddCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => handleOpenDialog('inventory')}
              >
                Get New Inventory
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => handleOpenDialog('validate')}
              >
                Validate Inventory
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => handleOpenDialog('upload')}
              >
                Upload Combo File
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Products" />
          <Tab label="Inventory Stats" />
        </Tabs>
        
        <Box sx={{ p: 2 }}>
          {activeTab === 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Stock</TableCell>
                    <TableCell>Auto Restock</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product._id}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.type}</TableCell>
                      <TableCell>
                        {product.stock === -1 ? 'Unlimited' : product.stock}
                      </TableCell>
                      <TableCell>
                        {product.obConfigId ? (
                          <Typography color="success.main">Enabled</Typography>
                        ) : (
                          <Typography color="error.main">Disabled</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenDialog('inventory', product)}
                          sx={{ mr: 1 }}
                        >
                          Restock
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenDialog('validate', product)}
                        >
                          Validate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {activeTab === 1 && (
            <Typography variant="body1" sx={{ p: 2 }}>
              Inventory statistics will be shown here
            </Typography>
          )}
        </Box>
      </Paper>
      
      {/* Dialogs */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'inventory' && 'Get New Inventory'}
          {dialogType === 'validate' && 'Validate Inventory'}
          {dialogType === 'upload' && 'Upload Combo File'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>
            {dialogType === 'inventory' && 'Start a new job to collect inventory for the selected product.'}
            {dialogType === 'validate' && 'Start a new job to validate existing inventory items.'}
            {dialogType === 'upload' && 'Upload a combo file to add inventory to the selected product.'}
          </DialogContentText>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Product</InputLabel>
            <Select
              value={selectedProduct ? selectedProduct._id : ''}
              onChange={(e) => {
                const product = products.find(p => p._id === e.target.value);
                setSelectedProduct(product);
              }}
              required
            >
              {products.map((product) => (
                <MenuItem key={product._id} value={product._id}>
                  {product.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {dialogType !== 'upload' && (
            <TextField
              label="Config ID"
              value={configId}
              onChange={(e) => setConfigId(e.target.value)}
              fullWidth
              margin="normal"
              required
              helperText="OpenBullet2 config ID to use for this job"
            />
          )}
          
          {dialogType === 'inventory' && (
            <TextField
              label="Target Count"
              type="number"
              value={targetCount}
              onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value) || 1))}
              fullWidth
              margin="normal"
              required
              InputProps={{ inputProps: { min: 1 } }}
              helperText="Number of items to collect"
            />
          )}
          
          {dialogType === 'upload' && (
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                Select File
                <input
                  type="file"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
              
              {selectedFile && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Selected file: {selectedFile.name}
                  </Typography>
                  
                  {uploadProgress > 0 && (
                    <Box sx={{ width: '100%', mt: 1 }}>
                      <LinearProgress variant="determinate" value={uploadProgress} />
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          {dialogType === 'inventory' && (
            <Button
              onClick={handleGetNewInventory}
              color="primary"
              disabled={!selectedProduct || !configId || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Start Job'}
            </Button>
          )}
          {dialogType === 'validate' && (
            <Button
              onClick={handleValidateInventory}
              color="primary"
              disabled={!selectedProduct || !configId || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Start Validation'}
            </Button>
          )}
          {dialogType === 'upload' && (
            <Button
              onClick={handleUploadInventory}
              color="primary"
              disabled={!selectedProduct || !selectedFile || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Upload'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryDashboard;