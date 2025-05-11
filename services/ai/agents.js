const openai = require('../azure/openai');
const cosmosDb = require('../azure/cosmos');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Get AI response for a user message
 * @param {string} userId - User ID
 * @param {string} message - User message
 * @param {string} agentId - AI agent ID or type
 * @returns {Promise<string>} - AI response
 */
async function getAIResponse(userId, message, agentId = 'default') {
  try {
    // Get conversation history
    const history = await getConversationHistory(userId);
    
    // Generate system message based on agent type
    const systemMessage = await getAgentSystemPrompt(agentId);
    
    // Generate AI response
    const response = await openai.generateText(message, {
      systemMessage,
      model: process.env.AZURE_OPENAI_DEPLOYMENT_GPT4O ? 'gpt-4o' : 'o3-mini',
      temperature: 0.7,
      maxTokens: 1000,
      conversationHistory: history
    });
    
    // Save conversation
    await saveConversation(userId, message, response);
    
    return response;
  } catch (error) {
    console.error('Error getting AI response:', error);
    return 'Sorry, I encountered an issue processing your request.';
  }
}

/**
 * Get conversation history for a user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of messages to retrieve
 * @returns {Promise<Array<Object>>} - Conversation history
 */
async function getConversationHistory(userId, limit = 10) {
  try {
    if (!cosmosDb) {
      // If Cosmos DB not available, return empty history
      return [];
    }
    
    const query = `
      SELECT TOP @limit c.role, c.content, c.timestamp
      FROM c
      WHERE c.userId = @userId
      ORDER BY c.timestamp DESC
    `;
    
    const parameters = [
      { name: '@userId', value: userId },
      { name: '@limit', value: limit }
    ];
    
    const results = await cosmosDb.queryItems(query, parameters);
    
    // Return in chronological order
    return results.reverse();
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

/**
 * Save conversation message to database
 * @param {string} userId - User ID
 * @param {string} userMessage - User message
 * @param {string} aiResponse - AI response
 * @returns {Promise<void>}
 */
async function saveConversation(userId, userMessage, aiResponse) {
  try {
    if (!cosmosDb) {
      // If Cosmos DB not available, skip saving
      return;
    }
    
    const timestamp = new Date().toISOString();
    
    // Save user message
    await cosmosDb.upsertItem({
      id: `${userId}-${timestamp}-user`,
      userId,
      role: 'user',
      content: userMessage,
      timestamp
    });
    
    // Save AI response
    await cosmosDb.upsertItem({
      id: `${userId}-${timestamp}-assistant`,
      userId,
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString() // Slightly different timestamp
    });
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}

/**
 * Get system prompt for an AI agent
 * @param {string} agentId - Agent ID or type
 * @returns {Promise<string>} - System prompt
 */
async function getAgentSystemPrompt(agentId) {
  // Default system prompts for different agent types
  const systemPrompts = {
    default: 'You are a helpful assistant in a chat application.',
    support: 'You are a customer support agent helping users with the K-Chat application. Be professional, friendly, and provide clear instructions.',
    sales: 'You are a sales representative for K-Chat premium accounts. Explain the benefits of premium accounts and help users with the purchase process.',
    moderator: 'You are a chat moderator. Ensure conversations remain civil and follow the community guidelines. Avoid sharing any illegal content or instructions.'
  };
  
  try {
    // Try to get custom agent prompt from database if available
    if (cosmosDb) {
      const agent = await cosmosDb.getItem(agentId, 'agent');
      if (agent && agent.systemPrompt) {
        return agent.systemPrompt;
      }
    }
    
    // Fallback to default prompts
    return systemPrompts[agentId] || systemPrompts.default;
  } catch (error) {
    console.error('Error getting agent system prompt:', error);
    return systemPrompts.default;
  }
}

module.exports = {
  getAIResponse,
  getConversationHistory,
  saveConversation
};