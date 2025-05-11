import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import AuthContext from '../context/auth/authContext';

const Shop = () => {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [credentials, setCredentials] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [purchaseHistoryOpen, setPurchaseHistoryOpen] = useState(false);
  const [credentialsCopied, setCredentialsCopied] = useState(false);

  useEffect(() => {
    loadProducts();
    loadPurchaseHistory();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/shop/products');
      setProducts(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseHistory = async () => {
    try {
      const res = await axios.get('/api/shop/purchases');
      setPurchases(res.data);
    } catch (err) {
      console.error('Error loading purchase history:', err);
    }
  };

  const handlePurchase = async (productId) => {
    try {
      setLoading(true);
      const res = await axios.post(`/api/shop/purchase/${productId}`);
      
      if (res.data.success) {
        setCredentials(res.data.credentials);
        setDialogOpen(true);
        loadPurchaseHistory(); // Refresh purchase history
      }
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Error purchasing product');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    navigator.clipboard.writeText(credentials)
      .then(() => {
        setCredentialsCopied(true);
        setTimeout(() => setCredentialsCopied(false), 3000);
      })
      .catch(err => console.error('Failed to copy credentials:', err));
  };

  return (
    <Box sx={{ p: 3, maxWidth: '1200px', mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/settings')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">K-Chat Shop</Typography>
        
        <Button 
          variant="outlined" 
          sx={{ ml: 'auto' }} 
          onClick={() => setPurchaseHistoryOpen(true)}
        >
          Purchase History
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <Grid container spacing={3}>
        {products.map((product) => (
          <Grid item xs={12} md={4} key={product._id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {product.name}
                </Typography>
                <Typography variant="h4" color="primary" gutterBottom>
                  ${product.price.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {product.description}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Type:</strong> {product.type.charAt(0).toUpperCase() + product.type.slice(1)}
                  </Typography>
                  {product.stock > 0 && (
                    <Typography variant="body2">
                      <strong>Stock:</strong> {product.stock} remaining
                    </Typography>
                  )}
                </Box>
              </CardContent>
              <CardActions>
                <Button 
                  variant="contained" 
                  fullWidth
                  disabled={loading || (product.stock === 0 && product.stock !== -1)}
                  onClick={() => handlePurchase(product._id)}
                >
                  Purchase
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Credentials Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Purchase Successful!</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Below are your credentials. Make sure to save them in a secure location.
          </DialogContentText>
          <Paper 
            sx={{ 
              p: 2, 
              mt: 2, 
              bgcolor: 'background.default',
              position: 'relative'
            }}
          >
            <Box sx={{ maxHeight: '300px', overflow: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {credentials}
            </Box>
            <IconButton 
              sx={{ position: 'absolute', top: 8, right: 8 }}
              onClick={handleCopyCredentials}
            >
              <ContentCopyIcon />
            </IconButton>
          </Paper>
          {credentialsCopied && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Credentials copied to clipboard!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Purchase History Dialog */}
      <Dialog 
        open={purchaseHistoryOpen} 
        onClose={() => setPurchaseHistoryOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Purchase History</DialogTitle>
        <DialogContent>
          {purchases.length === 0 ? (
            <DialogContentText>
              You haven't made any purchases yet.
            </DialogContentText>
          ) : (
            <Box>
              {purchases.map((purchase, index) => (
                <Paper key={purchase._id} sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle1">
                    <strong>{purchase.productId?.name || 'Product'}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Date: {new Date(purchase.date).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Price: ${purchase.price.toFixed(2)}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Credentials:</strong>
                    </Typography>
                    <Paper 
                      sx={{ 
                        p: 1, 
                        mt: 1, 
                        bgcolor: 'background.default',
                        position: 'relative',
                        maxHeight: '100px',
                        overflow: 'auto',
                        fontFamily: 'monospace'
                      }}
                    >
                      <Box sx={{ whiteSpace: 'pre-wrap' }}>
                        {purchase.credentials}
                      </Box>
                      <IconButton 
                        size="small"
                        sx={{ position: 'absolute', top: 4, right: 4 }}
                        onClick={() => {
                          navigator.clipboard.writeText(purchase.credentials);
                        }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurchaseHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Shop;