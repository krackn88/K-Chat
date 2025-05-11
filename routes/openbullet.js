const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const pgDb = require('../services/db/postgres');
const obIntegration = require('../services/openbullet/integration');
const automation = require('../services/agents/automation');

// Initialize PostgreSQL database on server start
pgDb.initDatabase()
  .then(() => console.log('PostgreSQL database initialized'))
  .catch(err => console.error('Error initializing PostgreSQL database:', err));

// @route   POST api/openbullet/webhook
// @desc    Receive webhook from OpenBullet2
// @access  Public with signature verification
router.post('/webhook', async (req, res) => {
  // Get signature from header
  const signature = req.header('X-Webhook-Signature');
  
  // Verify signature if configured
  if (process.env.OPENBULLET_WEBHOOK_SECRET && !signature) {
    return res.status(401).json({ msg: 'Missing webhook signature' });
  }
  
  if (process.env.OPENBULLET_WEBHOOK_SECRET && !obIntegration.verifyWebhookSignature(signature, req.body)) {
    return res.status(401).json({ msg: 'Invalid webhook signature' });
  }
  
  try {
    // Record webhook event
    const eventId = await pgDb.recordWebhookEvent(req.body.type || 'unknown', req.body);
    
    res.json({ success: true, eventId });
    
    // Process event asynchronously
    obIntegration.processWebhookEvent(req.body)
      .catch(err => console.error('Error processing webhook event:', err));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/openbullet/status
// @desc    Get OpenBullet2 API status
// @access  Admin
router.get('/status', [auth, admin], async (req, res) => {
  try {
    const status = await obIntegration.getApiStatus();
    res.json(status);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message });
  }
});

// @route   POST api/openbullet/jobs
// @desc    Create a new job
// @access  Admin
router.post(
  '/jobs',
  [
    auth,
    admin,
    [
      check('jobName', 'Job name is required').not().isEmpty(),
      check('configId', 'Config ID is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { jobName, configId, wordlistPath, options } = req.body;
      
      const job = await obIntegration.createJob(jobName, configId, wordlistPath, options);
      res.json(job);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: err.message });
    }
  }
);

// @route   POST api/openbullet/jobs/:jobId/start
// @desc    Start a job
// @access  Admin
router.post('/jobs/:jobId/start', [auth, admin], async (req, res) => {
  try {
    const jobStatus = await obIntegration.startJob(req.params.jobId);
    res.json(jobStatus);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message });
  }
});

// @route   POST api/openbullet/jobs/:jobId/stop
// @desc    Stop a job
// @access  Admin
router.post('/jobs/:jobId/stop', [auth, admin], async (req, res) => {
  try {
    const jobStatus = await obIntegration.stopJob(req.params.jobId);
    res.json(jobStatus);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message });
  }
});

// @route   GET api/openbullet/jobs/:jobId
// @desc    Get job status
// @access  Admin
router.get('/jobs/:jobId', [auth, admin], async (req, res) => {
  try {
    const jobStatus = await obIntegration.getJobStatus(req.params.jobId);
    res.json(jobStatus);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message });
  }
});

// @route   GET api/openbullet/jobs/:jobId/hits
// @desc    Get job hits
// @access  Admin
router.get('/jobs/:jobId/hits', [auth, admin], async (req, res) => {
  try {
    const hits = await obIntegration.getJobHits(req.params.jobId);
    res.json(hits);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message });
  }
});

// @route   POST api/openbullet/validate/:productId
// @desc    Validate inventory items for a product
// @access  Admin
router.post(
  '/validate/:productId',
  [
    auth,
    admin,
    [
      check('configId', 'Config ID is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const result = await obIntegration.validateItems(
        req.params.productId,
        req.body.configId
      );
      
      res.json(result);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: err.message });
    }
  }
);

// @route   POST api/openbullet/inventory/:productId
// @desc    Get new inventory for a product
// @access  Admin
router.post(
  '/inventory/:productId',
  [
    auth,
    admin,
    [
      check('configId', 'Config ID is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const result = await obIntegration.getNewInventory(
        req.params.productId,
        req.body.configId,
        req.body.targetCount || 100
      );
      
      res.json(result);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: err.message });
    }
  }
);

// @route   GET api/openbullet/inventory/stats/:productId
// @desc    Get inventory stats for a product
// @access  Admin
router.get('/inventory/stats/:productId', [auth, admin], async (req, res) => {
  try {
    const stats = await pgDb.getInventoryStats(req.params.productId);
    res.json(stats);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message });
  }
});

// @route   GET api/openbullet/inventory/low
// @desc    Get low stock products
// @access  Admin
router.get('/inventory/low', [auth, admin], async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    const lowStockProducts = await pgDb.getLowStockProducts(threshold);
    res.json(lowStockProducts);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message });
  }
});

// @route   POST api/openbullet/automation/start
// @desc    Start automation jobs
// @access  Admin
router.post('/automation/start', [auth, admin], async (req, res) => {
  try {
    const result = automation.startAllJobs();
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message });
  }
});

// @route   POST api/openbullet/automation/stop
// @desc    Stop automation jobs
// @access  Admin
router.post('/automation/stop', [auth, admin], async (req, res) => {
  try {
    const result = automation.stopAllJobs();
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message });
  }
});

// @route   GET api/openbullet/automation/status
// @desc    Get automation jobs status
// @access  Admin
router.get('/automation/status', [auth, admin], async (req, res) => {
  try {
    const result = automation.getActiveJobs();
    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message });
  }
});

module.exports = router;