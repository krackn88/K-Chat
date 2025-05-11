const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const seller = require('../middleware/seller');
const marketplace = require('../services/shop/marketplace');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Set up file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// @route   GET api/marketplace/products
// @desc    Get products
// @access  Public
router.get('/products', async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      subcategory: req.query.subcategory,
      type: req.query.type,
      featured: req.query.featured === 'true' ? true : undefined,
      search: req.query.search,
      sort: req.query.sort,
      page: req.query.page,
      limit: req.query.limit
    };
    
    const result = await marketplace.getProducts(filters);
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/marketplace/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name');
    
    if (!product) {
      return res.status(404).json({ msg: 'Product not found' });
    }
    
    res.json(product);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Product not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/marketplace/products
// @desc    Create a product
// @access  Seller
router.post(
  '/products',
  [
    auth,
    seller,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('price', 'Price is required').isNumeric(),
      check('category', 'Category is required').not().isEmpty(),
      check('type', 'Type is required').isIn(['service', 'file', 'account', 'combo', 'subscription'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Add seller ID to product data
      const productData = {
        ...req.body,
        seller: req.user.id
      };
      
      const product = await marketplace.createProduct(productData);
      res.json(product);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST api/marketplace/products/:id/stock
// @desc    Add stock to product
// @access  Seller
router.post(
  '/products/:id/stock',
  [
    auth,
    seller,
    [
      check('content', 'Content is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ msg: 'Product not found' });
      }
      
      // Check if user is the seller
      if (product.seller.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }
      
      const stockItems = await marketplace.addStock(
        req.params.id,
        req.body.content,
        req.body.quantity || 1
      );
      
      res.json({
        added: stockItems.length,
        newStock: await Stock.countDocuments({ product: req.params.id, used: false })
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST api/marketplace/products/:id/file
// @desc    Upload file for product
// @access  Seller
router.post(
  '/products/:id/file',
  [
    auth,
    seller,
    upload.single('file')
  ],
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ msg: 'Product not found' });
      }
      
      // Check if user is the seller
      if (product.seller.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }
      
      if (!req.file) {
        return res.status(400).json({ msg: 'No file uploaded' });
      }
      
      // Update product with file ID (using filename as ID)
      product.fileId = req.file.filename;
      await product.save();
      
      res.json({
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/marketplace/products/:id
// @desc    Update product
// @access  Seller
router.put(
  '/products/:id',
  [
    auth,
    seller
  ],
  async (req, res) => {
    try {
      let product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ msg: 'Product not found' });
      }
      
      // Check if user is the seller
      if (product.seller.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }
      
      // Fields that can be updated
      const updatableFields = [
        'name', 'description', 'price', 'category', 'subcategory',
        'active', 'featured', 'quantityOptions', 'template', 'customFields',
        'stockWarning'
      ];
      
      // Update fields
      updatableFields.forEach(field => {
        if (req.body[field] !== undefined) {
          product[field] = req.body[field];
        }
      });
      
      await product.save();
      
      res.json(product);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Product not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE api/marketplace/products/:id
// @desc    Delete product
// @access  Seller
router.delete(
  '/products/:id',
  [
    auth,
    seller
  ],
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ msg: 'Product not found' });
      }
      
      // Check if user is the seller
      if (product.seller.toString() !== req.user.id && !req.user.isAdmin) {
        return res.status(401).json({ msg: 'User not authorized' });
      }
      
      await product.remove();
      
      res.json({ msg: 'Product removed' });
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Product not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST api/marketplace/order/:productId
// @desc    Create an order
// @access  Private/Public
router.post(
  '/order/:productId',
  [
    check('quantity', 'Quantity must be at least 1').optional().isInt({ min: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const product = await Product.findById(req.params.productId);
      
      if (!product) {
        return res.status(404).json({ msg: 'Product not found' });
      }
      
      // Check if product is active
      if (!product.active) {
        return res.status(400).json({ msg: 'Product is not available' });
      }
      
      // Check if product has stock
      if (product.stock === 0) {
        return res.status(400).json({ msg: 'Product is out of stock' });
      }
      
      // Determine quantity and price
      const quantity = req.body.quantity || 1;
      let price = product.price;
      
      // Check for quantity-based pricing
      if (product.quantityOptions && product.quantityOptions.length > 0) {
        const option = product.quantityOptions.find(opt => opt.quantity === quantity);
        if (option) {
          price = option.price;
        } else {
          price = product.price * quantity;
        }
      } else {
        price = product.price * quantity;
      }
      
      // Prepare order data
      const orderData = {
        product: product._id,
        seller: product.seller,
        quantity,
        price,
        customFields: req.body.customFields || [],
        payment: {
          method: req.body.paymentMethod || 'credit',
          status: 'pending'
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };
      
      // Add customer information
      if (req.user) {
        orderData.customer = req.user.id;
      } else if (req.body.email) {
        orderData.email = req.body.email;
      } else {
        return res.status(400).json({ msg: 'Email is required for guest checkout' });
      }
      
      const order = await marketplace.createOrder(orderData);
      
      res.json(order);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/marketplace/orders
// @desc    Get user orders
// @access  Private
router.get('/orders', auth, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      product: req.query.product,
      sort: req.query.sort,
      page: req.query.page,
      limit: req.query.limit
    };
    
    const result = await marketplace.getOrderHistory(req.user.id, filters);
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/marketplace/sales
// @desc    Get seller sales
// @access  Seller
router.get('/sales', auth, seller, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      product: req.query.product,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sort: req.query.sort,
      page: req.query.page,
      limit: req.query.limit
    };
    
    const result = await marketplace.getSales(req.user.id, filters);
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/marketplace/wallet
// @desc    Get user wallet
// @access  Private
router.get('/wallet', auth, async (req, res) => {
  try {
    const wallet = await marketplace.getUserWallet(req.user.id);
    res.json(wallet);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/marketplace/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/orders/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('product', 'name price type category')
      .populate('seller', 'name email');
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Check if user is the customer or seller
    if (
      (order.customer && order.customer.toString() !== req.user.id) &&
      order.seller.toString() !== req.user.id &&
      !req.user.isAdmin
    ) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    res.json(order);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Order not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/marketplace/orders/:id/status
// @desc    Update order status
// @access  Seller/Admin
router.put(
  '/orders/:id/status',
  [
    auth,
    [
      check('status', 'Status is required').isIn(['pending', 'completed', 'failed', 'refunded', 'disputed'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({ msg: 'Order not found' });
      }
      
      // Check if user is the seller or admin
      if (order.seller.toString() !== req.user.id && !req.user.isAdmin) {
        return res.status(401).json({ msg: 'User not authorized' });
      }
      
      const updatedOrder = await marketplace.updateOrderStatus(order._id, req.body.status);
      
      res.json(updatedOrder);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST api/marketplace/orders/:id/payment
// @desc    Process payment for order
// @access  Private
router.post(
  '/orders/:id/payment',
  [
    auth,
    [
      check('status', 'Status is required').isIn(['pending', 'completed', 'failed'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({ msg: 'Order not found' });
      }
      
      // Check if user is the customer
      if (order.customer && order.customer.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }
      
      const updatedOrder = await marketplace.processPayment(order._id, req.body);
      
      res.json(updatedOrder);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/marketplace/download/:orderId/:token
// @desc    Download file for order
// @access  Private
router.get('/download/:orderId/:token', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Check if user is the customer
    if (order.customer && order.customer.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Check if order is completed and delivered
    if (order.status !== 'completed' || !order.deliveryData.delivered) {
      return res.status(400).json({ msg: 'Order not eligible for download' });
    }
    
    // Validate token (this is a simplified version)
    const validToken = crypto.timingSafeEqual(
      Buffer.from(req.params.token),
      Buffer.from(req.params.token)
    );
    
    if (!validToken) {
      return res.status(401).json({ msg: 'Invalid download token' });
    }
    
    // Handle different content types
    if (order.deliveryData.contentType === 'file') {
      const fileId = order.deliveryData.content;
      const filePath = path.join(process.env.UPLOAD_PATH || './uploads', fileId);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ msg: 'File not found' });
      }
      
      // Send file
      return res.download(filePath);
    } else {
      // For text content, send as plain text
      return res.send(order.deliveryData.content);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;