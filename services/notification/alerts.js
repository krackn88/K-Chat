const nodemailer = require('nodemailer');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Notification configuration
const notificationEmail = process.env.NOTIFICATION_EMAIL;
const notificationSms = process.env.NOTIFICATION_SMS;
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
const telegramAdminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
const telegramBotToken = process.env.BOT_TOKEN;

// Create nodemailer transporter
let emailTransporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
}

/**
 * Send an email notification
 * @param {string} subject - Email subject
 * @param {string} message - Email message
 * @param {string} to - Email recipient
 * @returns {Promise<Object>} - Email send result
 */
async function sendEmailNotification(subject, message, to = notificationEmail) {
  if (!emailTransporter || !to) {
    console.warn('Email notification not configured');
    return { success: false, message: 'Email notification not configured' };
  }
  
  try {
    const result = await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@kchat.local',
      to,
      subject,
      text: message,
      html: message.replace(/\n/g, '<br>')
    });
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email notification:', error.message);
    return { success: false, message: `Error sending email: ${error.message}` };
  }
}

/**
 * Send a Discord webhook notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} color - Embed color (hex)
 * @param {Array} fields - Additional fields
 * @returns {Promise<Object>} - Webhook send result
 */
async function sendDiscordNotification(title, message, color = '#ff0000', fields = []) {
  if (!discordWebhookUrl) {
    console.warn('Discord webhook not configured');
    return { success: false, message: 'Discord webhook not configured' };
  }
  
  try {
    const payload = {
      embeds: [
        {
          title,
          description: message,
          color: parseInt(color.replace('#', ''), 16),
          fields,
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    await axios.post(discordWebhookUrl, payload);
    
    return { success: true };
  } catch (error) {
    console.error('Error sending Discord notification:', error.message);
    return { success: false, message: `Error sending Discord notification: ${error.message}` };
  }
}

/**
 * Send a Telegram notification
 * @param {string} message - Notification message
 * @param {string} chatId - Telegram chat ID
 * @returns {Promise<Object>} - Message send result
 */
async function sendTelegramNotification(message, chatId = telegramAdminChatId) {
  if (!telegramBotToken || !chatId) {
    console.warn('Telegram notification not configured');
    return { success: false, message: 'Telegram notification not configured' };
  }
  
  try {
    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    };
    
    const response = await axios.post(url, payload);
    
    return { success: true, messageId: response.data.result.message_id };
  } catch (error) {
    console.error('Error sending Telegram notification:', error.message);
    return { success: false, message: `Error sending Telegram notification: ${error.message}` };
  }
}

/**
 * Send a low stock alert
 * @param {Array} products - Low stock products
 * @param {number} threshold - Stock threshold
 * @returns {Promise<Object>} - Alert send results
 */
async function sendLowStockAlert(products, threshold) {
  // Skip if no products
  if (!products || products.length === 0) {
    return { success: true, message: 'No low stock products to alert about' };
  }
  
  // Prepare notification message
  const title = `🚨 Low Stock Alert: ${products.length} products below threshold`;
  let message = `The following products are running low on stock (threshold: ${threshold}):\n\n`;
  
  products.forEach(product => {
    message += `• Product ID: ${product.product_id}\n`;
    message += `  Current stock: ${product.available_items}\n`;
    message += `  Threshold: ${threshold}\n\n`;
  });
  
  // Prepare Discord fields
  const fields = products.map(product => ({
    name: `Product: ${product.product_id}`,
    value: `Current stock: ${product.available_items} / Threshold: ${threshold}`,
    inline: true
  }));
  
  // Send notifications
  const results = {
    email: await sendEmailNotification(title, message),
    discord: await sendDiscordNotification(title, message, '#ff9800', fields),
    telegram: await sendTelegramNotification(`<b>${title}</b>\n\n${message}`)
  };
  
  return {
    success: Object.values(results).some(r => r.success),
    results
  };
}

/**
 * Send a restock job started alert
 * @param {Array} restockJobs - Restock jobs that were started
 * @returns {Promise<Object>} - Alert send results
 */
async function sendRestockJobAlert(restockJobs) {
  // Skip if no restock jobs
  if (!restockJobs || restockJobs.length === 0) {
    return { success: true, message: 'No restock jobs to alert about' };
  }
  
  // Prepare notification message
  const title = `🔄 Restock Jobs Started: ${restockJobs.length} products`;
  let message = `Automatic restock jobs have been started for the following products:\n\n`;
  
  restockJobs.forEach(job => {
    message += `• Product ID: ${job.productId}\n`;
    message += `  Job ID: ${job.jobId || 'N/A'}\n`;
    message += `  Target: ${job.targetCount || 'Unknown'} items\n`;
    message += `  Status: ${job.success ? 'Started' : 'Failed'}\n\n`;
  });
  
  // Prepare Discord fields
  const fields = restockJobs.map(job => ({
    name: `Product: ${job.productId}`,
    value: `Job: ${job.jobId || 'N/A'}\nTarget: ${job.targetCount || 'Unknown'} items\nStatus: ${job.success ? '✅ Started' : '❌ Failed'}`,
    inline: true
  }));
  
  // Send notifications
  const results = {
    email: await sendEmailNotification(title, message),
    discord: await sendDiscordNotification(title, message, '#4caf50', fields),
    telegram: await sendTelegramNotification(`<b>${title}</b>\n\n${message}`)
  };
  
  return {
    success: Object.values(results).some(r => r.success),
    results
  };
}

/**
 * Send an error alert
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {Object} details - Error details
 * @returns {Promise<Object>} - Alert send results
 */
async function sendErrorAlert(title, message, details = {}) {
  // Prepare notification message
  const fullMessage = `${message}\n\nDetails:\n${JSON.stringify(details, null, 2)}`;
  
  // Prepare Discord fields
  const fields = Object.entries(details).map(([key, value]) => ({
    name: key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    inline: false
  }));
  
  // Send notifications
  const results = {
    email: await sendEmailNotification(`❌ ${title}`, fullMessage),
    discord: await sendDiscordNotification(`❌ ${title}`, message, '#f44336', fields),
    telegram: await sendTelegramNotification(`<b>❌ ${title}</b>\n\n${message}\n\n<pre>${JSON.stringify(details, null, 2)}</pre>`)
  };
  
  return {
    success: Object.values(results).some(r => r.success),
    results
  };
}

module.exports = {
  sendEmailNotification,
  sendDiscordNotification,
  sendTelegramNotification,
  sendLowStockAlert,
  sendRestockJobAlert,
  sendErrorAlert
};