import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

import AuthContext from '../context/auth/authContext';

const Marketplace = () => {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [deliveryContent, setDeliveryContent] = useState('');
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [contentCopied, setContentCopied] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    loadProducts();
  }, []);
  
  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/marketplace/products');
      
      setProducts(res.data.products);
      setFilteredProducts(res.data.products);
      setTotalPages(res.data.pagination.pages);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(res.data.products.map(product => product.category))];
      setCategories(uniqueCategories);
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Error loading products');
    } finally {
      setLoading(false);
    }
  };
  
  const filterProducts = () => {
    let filtered = [...products];
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.description.toLowerCase().includes(query)
      );
    }
    
    setFilteredProducts(filtered);
  };
  
  useEffect(() => {
    filterProducts();
  }, [selectedCategory, searchQuery, products]);
  
  const handleCategoryChange = (event, newValue) => {
    setSelectedCategory(newValue);
  };
  
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  const handlePurchase = (product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setOrderDialogOpen(true);
  };
  
  const handleConfirmOrder = async () => {
    try {
      setLoading(true);
      
      const orderData = {
        quantity: quantity
      };
      
      const res = await axios.post(`/api/marketplace/order/${selectedProduct._id}`, orderData);
      
      // For demonstration, we'll simulate a completed payment
      await axios.put(`/api/marketplace/orders/${res.data._id}/status`, {
        status: 'completed'
      });
      
      // Get the updated order with delivery content
      const orderRes = await axios.get(`/api/marketplace/orders/${res.data._id}`);
      
      setDeliveryContent(orderRes.data.deliveryData.content);
      setOrderDialogOpen(false);
      setDeliveryDialogOpen(true);
      loadProducts(); // Refresh products list
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.msg || 'Error creating order');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCopyContent = () => {
    navigator.clipboard.writeText(deliveryContent)
      .then(() => {
        setContentCopied(true);
        setTimeout(() => setContentCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy content:', err));
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Digital Marketplace
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search products..."
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                startIcon={<ShoppingCartIcon />}
                onClick={() => navigate('/orders')}
              >
                My Orders
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={selectedCategory}
          onChange={handleCategoryChange}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab value="all" label="All Products" />
          {categories.map((category) => (
            <Tab key={category} value={category} label={category.charAt(0).toUpperCase() + category.slice(1)} />
          ))}
        </Tabs>
      </Box>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      <Grid container spacing={3}>
        {filteredProducts.map((product) => (
          <Grid item xs={12} sm={6} md={4} key={product._id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="div" gutterBottom>
                  {product.name}
                </Typography>
                <Typography variant="h5" color="primary" gutterBottom>
                  ${product.price.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {product.description}
                </Typography>
                <Typography variant="body2">
                  <strong>Category:</strong> {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                </Typography>
                <Typography variant="body2">
                  <strong>Type:</strong> {product.type.charAt(0).toUpperCase() + product.type.slice(1)}
                </Typography>
                {product.type === 'combo' && (
                  <Typography variant="body2">
                    <strong>Combo Count:</strong> {product.comboCount.toLocaleString()}
                  </Typography>
                )}
                {product.stock !== -1 && (
                  <Typography variant="body2">
                    <strong>Stock:</strong> {product.stock} available
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handlePurchase(product)}
                  disabled={product.stock === 0}
                >
                  {product.stock === 0 ? 'Out of Stock' : 'Purchase'}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {filteredProducts.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', my: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No products found
          </Typography>
        </Box>
      )}
      
      {/* Purchase Dialog */}
      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Purchase</DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <>
              <Typography variant="h6">{selectedProduct.name}</Typography>
              <Typography variant="body1" paragraph>
                ${selectedProduct.price.toFixed(2)}
              </Typography>
              
              <TextField
                label="Quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                fullWidth
                margin="normal"
                InputProps={{ inputProps: { min: 1 } }}
              />
              
              <Typography variant="h6" mt={2}>
                Total: ${(selectedProduct.price * quantity).toFixed(2)}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmOrder} 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Confirm Purchase'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delivery Dialog */}
      <Dialog open={deliveryDialogOpen} onClose={() => setDeliveryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Purchase Successful!</DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>
            Below are your items. Make sure to save them in a secure location.
          </DialogContentText>
          
          <Paper 
            sx={{ 
              p: 2, 
              mt: 2, 
              bgcolor: 'background.default',
              position: 'relative',
              maxHeight: '300px',
              overflow: 'auto'
            }}
          >
            <Box sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {deliveryContent}
            </Box>
            <IconButton
              sx={{ position: 'absolute', top: 8, right: 8 }}
              onClick={handleCopyContent}
              size="small"
            >
              <ContentCopyIcon />
            </IconButton>
          </Paper>
          
          {contentCopied && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Content copied to clipboard!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Marketplace;