const { Telegraf } = require('telegraf');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Telegram bot
const botToken = process.env.BOT_TOKEN;
let bot = null;

if (botToken) {
  try {
    bot = new Telegraf(botToken);
  } catch (error) {
    console.error('Error initializing Telegram bot:', error);
  }
}

/**
 * Start the Telegram bot
 * @param {Function} messageHandler - Function to handle incoming messages
 * @returns {Promise<void>}
 */
async function startBot(messageHandler) {
  if (!bot) {
    throw new Error('Telegram bot not configured');
  }

  // Handle text messages
  bot.on('text', async (ctx) => {
    try {
      const message = ctx.message.text;
      const userId = ctx.from.id;
      const firstName = ctx.from.first_name;
      const lastName = ctx.from.last_name || '';
      
      // Process message with the provided handler
      const response = await messageHandler({
        message,
        userId,
        firstName,
        lastName,
        platform: 'telegram'
      });
      
      // Send response back to user
      await ctx.reply(response);
    } catch (error) {
      console.error('Error handling Telegram message:', error);
      await ctx.reply('Sorry, there was an error processing your message.');
    }
  });

  // Handle commands
  bot.command('start', async (ctx) => {
    await ctx.reply('Welcome to K-Chat! Send me a message to get started.');
  });

  bot.command('help', async (ctx) => {
    await ctx.reply('K-Chat Bot Help:\n\n' +
      'Just send me any message to chat.\n' +
      'Use /start to restart the conversation.\n' +
      'Use /help to see this message.');
  });

  // Launch the bot
  await bot.launch();
  console.log('Telegram bot started');

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

/**
 * Send a message to a Telegram user
 * @param {string} userId - Telegram user ID
 * @param {string} message - Message to send
 * @returns {Promise<void>}
 */
async function sendMessage(userId, message) {
  if (!bot) {
    throw new Error('Telegram bot not configured');
  }

  try {
    await bot.telegram.sendMessage(userId, message);
  } catch (error) {
    console.error(`Error sending message to user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  startBot,
  sendMessage
};