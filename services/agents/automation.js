const schedule = require('node-schedule');
const pgDb = require('../db/postgres');
const obIntegration = require('../openbullet/integration');
const alerts = require('../notification/alerts');
const Product = require('../../models/Product');

// Store active jobs
let activeJobs = {};

/**
 * Start the stock monitoring job
 * @param {number} threshold - Stock threshold to trigger alerts
 * @param {number} interval - Check interval in minutes
 * @returns {Object} - Job information
 */
function startStockMonitoringJob(threshold = 10, interval = 60) {
  if (activeJobs.stockMonitoring) {
    activeJobs.stockMonitoring.cancel();
  }
  
  console.log(`Starting stock monitoring job (threshold: ${threshold}, interval: ${interval} minutes)`);
  
  // Schedule job to run at the specified interval
  const job = schedule.scheduleJob(`*/${interval} * * * *`, async function() {
    try {
      console.log('Running stock monitoring job...');
      
      // Get low stock products
      const lowStockProducts = await pgDb.getLowStockProducts(threshold);
      
      if (lowStockProducts.length > 0) {
        console.log(`Found ${lowStockProducts.length} products below threshold ${threshold}`);
        
        // Send alert
        await alerts.sendLowStockAlert(lowStockProducts, threshold);
        
        // Create config map for restocking
        const configMap = {};
        
        // Get OpenBullet2 config mapping from products
        for (const product of lowStockProducts) {
          try {
            const dbProduct = await Product.findById(product.product_id);
            if (dbProduct && dbProduct.obConfigId) {
              configMap[product.product_id] = dbProduct.obConfigId;
            }
          } catch (error) {
            console.error(`Error getting config for product ${product.product_id}:`, error.message);
          }
        }
        
        // Start restock jobs
        const restockResult = await obIntegration.checkAndRestockProducts(threshold, configMap);
        
        if (restockResult.restockStarted && restockResult.restockStarted.length > 0) {
          // Send restock job alert
          await alerts.sendRestockJobAlert(restockResult.restockStarted);
        }
      } else {
        console.log('No products below threshold');
      }
    } catch (error) {
      console.error('Error in stock monitoring job:', error.message);
      
      // Send error alert
      await alerts.sendErrorAlert(
        'Stock Monitoring Job Failed',
        `The stock monitoring job encountered an error: ${error.message}`,
        { stack: error.stack }
      );
    }
  });
  
  activeJobs.stockMonitoring = job;
  
  return {
    jobId: 'stockMonitoring',
    threshold,
    interval,
    nextInvocation: job.nextInvocation()
  };
}

/**
 * Start the webhook processing job
 * @param {number} interval - Processing interval in minutes
 * @returns {Object} - Job information
 */
function startWebhookProcessingJob(interval = 5) {
  if (activeJobs.webhookProcessing) {
    activeJobs.webhookProcessing.cancel();
  }
  
  console.log(`Starting webhook processing job (interval: ${interval} minutes)`);
  
  // Schedule job to run at the specified interval
  const job = schedule.scheduleJob(`*/${interval} * * * *`, async function() {
    try {
      console.log('Running webhook processing job...');
      
      // Get unprocessed webhook events
      const events = await pgDb.getUnprocessedWebhookEvents(100);
      
      if (events.length > 0) {
        console.log(`Processing ${events.length} unprocessed webhook events`);
        
        for (const event of events) {
          try {
            await obIntegration.processWebhookEvent(event);
          } catch (error) {
            console.error(`Error processing webhook event ${event.id}:`, error.message);
          }
        }
      } else {
        console.log('No unprocessed webhook events');
      }
    } catch (error) {
      console.error('Error in webhook processing job:', error.message);
      
      // Send error alert
      await alerts.sendErrorAlert(
        'Webhook Processing Job Failed',
        `The webhook processing job encountered an error: ${error.message}`,
        { stack: error.stack }
      );
    }
  });
  
  activeJobs.webhookProcessing = job;
  
  return {
    jobId: 'webhookProcessing',
    interval,
    nextInvocation: job.nextInvocation()
  };
}

/**
 * Start the data validation job
 * @param {number} interval - Validation interval in hours
 * @returns {Object} - Job information
 */
function startDataValidationJob(interval = 24) {
  if (activeJobs.dataValidation) {
    activeJobs.dataValidation.cancel();
  }
  
  console.log(`Starting data validation job (interval: ${interval} hours)`);
  
  // Schedule job to run at the specified interval
  const job = schedule.scheduleJob(`0 */${interval} * * *`, async function() {
    try {
      console.log('Running data validation job...');
      
      // Get all products
      const products = await Product.find({ active: true });
      
      for (const product of products) {
        if (!product.obValidationConfigId) {
          console.log(`Skipping validation for product ${product._id} - no validation config`);
          continue;
        }
        
        // Check if product has unchecked items
        const stats = await pgDb.getInventoryStats(product._id.toString());
        
        if (stats.unchecked_items > 0) {
          console.log(`Validating ${stats.unchecked_items} items for product ${product._id}`);
          
          // Start validation job
          const result = await obIntegration.validateItems(
            product._id.toString(),
            product.obValidationConfigId
          );
          
          console.log(`Validation job result:`, result);
        } else {
          console.log(`No unchecked items for product ${product._id}`);
        }
      }
    } catch (error) {
      console.error('Error in data validation job:', error.message);
      
      // Send error alert
      await alerts.sendErrorAlert(
        'Data Validation Job Failed',
        `The data validation job encountered an error: ${error.message}`,
        { stack: error.stack }
      );
    }
  });
  
  activeJobs.dataValidation = job;
  
  return {
    jobId: 'dataValidation',
    interval,
    nextInvocation: job.nextInvocation()
  };
}

/**
 * Start all automation jobs
 * @returns {Object} - Job information
 */
function startAllJobs() {
  const jobs = {
    stockMonitoring: startStockMonitoringJob(),
    webhookProcessing: startWebhookProcessingJob(),
    dataValidation: startDataValidationJob()
  };
  
  return {
    message: 'All automation jobs started',
    jobs
  };
}

/**
 * Stop all automation jobs
 * @returns {Object} - Result
 */
function stopAllJobs() {
  Object.keys(activeJobs).forEach(jobId => {
    if (activeJobs[jobId]) {
      activeJobs[jobId].cancel();
      console.log(`Stopped job: ${jobId}`);
    }
  });
  
  activeJobs = {};
  
  return {
    message: 'All automation jobs stopped'
  };
}

/**
 * Get active jobs information
 * @returns {Object} - Active jobs
 */
function getActiveJobs() {
  const jobs = {};
  
  Object.keys(activeJobs).forEach(jobId => {
    if (activeJobs[jobId]) {
      jobs[jobId] = {
        nextInvocation: activeJobs[jobId].nextInvocation()
      };
    }
  });
  
  return {
    activeJobs: jobs
  };
}

module.exports = {
  startStockMonitoringJob,
  startWebhookProcessingJob,
  startDataValidationJob,
  startAllJobs,
  stopAllJobs,
  getActiveJobs
};