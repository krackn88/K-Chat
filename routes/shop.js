const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const products = require('../services/shop/products');

// @route   GET api/shop/products
// @desc    Get all products
// @access  Private
router.get('/products', auth, async (req, res) => {
  try {
    const productList = await products.getProducts();
    res.json(productList);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/shop/products
// @desc    Create a product
// @access  Admin
router.post(
  '/products',
  [
    auth,
    admin,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('price', 'Price is required').isNumeric(),
      check('type', 'Type is required').isIn(['account', 'combo', 'subscription'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const product = await products.createProduct(req.body);
      res.json(product);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST api/shop/purchase/:productId
// @desc    Purchase a product
// @access  Private
router.post('/purchase/:productId', auth, async (req, res) => {
  try {
    const product = await products.Product.findById(req.params.productId);
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    
    if (!product.active || (product.stock !== -1 && product.stock <= 0)) {
      return res.status(400).json({ msg: 'Product is not available' });
    }
    
    const result = await products.generateCredentials(product, req.user.id);
    
    res.json({
      success: true,
      credentials: result.credentials,
      purchaseId: result.purchase._id
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shop/purchases
// @desc    Get purchase history
// @access  Private
router.get('/purchases', auth, async (req, res) => {
  try {
    const purchaseHistory = await products.getPurchaseHistory(req.user.id);
    res.json(purchaseHistory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;