const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Azure OpenAI configurations
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const gpt4oDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_GPT4O;
const o3miniDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_O3MINI;

// Initialize the Azure OpenAI client
let client;

const initOpenAIClient = () => {
  try {
    if (!endpoint || !apiKey) {
      console.warn('Azure OpenAI credentials not found. AI features will be unavailable.');
      return false;
    }

    client = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
    console.log('Azure OpenAI client initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Azure OpenAI client:', error);
    return false;
  }
};

// Generate a chat completion using GPT-4o
const generateChatCompletion = async (messages, options = {}) => {
  try {
    if (!client) {
      const initialized = initOpenAIClient();
      if (!initialized) return null;
    }

    const deploymentId = options.model === 'o3-mini' ? o3miniDeployment : gpt4oDeployment;
    
    const defaultOptions = {
      temperature: 0.7,
      maxTokens: 800,
      topP: 0.95,
      frequencyPenalty: 0,
      presencePenalty: 0
    };

    const requestOptions = { ...defaultOptions, ...options };

    const result = await client.getChatCompletions(
      deploymentId,
      messages,
      requestOptions
    );

    return {
      success: true,
      response: result.choices[0].message.content,
      usage: result.usage
    };
  } catch (error) {
    console.error('Error generating chat completion:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Create a structured response based on a template
const processAIResponse = async (userMessage, agentProfile, conversationHistory = []) => {
  try {
    // Format the conversation history
    const formattedHistory = conversationHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Add system message with agent profile
    const messages = [
      {
        role: 'system',
        content: `You are ${agentProfile.name}, an AI assistant with the following persona: ${agentProfile.description}. 
                  Respond in a style that matches this persona. Be helpful, insightful, and engaging.`
      },
      ...formattedHistory,
      {
        role: 'user',
        content: userMessage
      }
    ];

    // Generate response
    const completion = await generateChatCompletion(messages, {
      temperature: agentProfile.temperature || 0.7,
      model: agentProfile.model || 'gpt-4o'
    });

    if (!completion || !completion.success) {
      throw new Error(completion?.error || 'Failed to generate AI response');
    }

    return {
      content: completion.response,
      role: 'assistant',
      agentId: agentProfile._id,
      agentName: agentProfile.name,
      usage: completion.usage
    };
  } catch (error) {
    console.error('Error processing AI response:', error);
    return {
      content: 'I apologize, but I encountered an error processing your request. Please try again later.',
      role: 'assistant',
      agentId: agentProfile._id,
      agentName: agentProfile.name,
      error: error.message
    };
  }
};

module.exports = {
  initOpenAIClient,
  generateChatCompletion,
  processAIResponse
};
