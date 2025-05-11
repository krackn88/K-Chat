const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Azure OpenAI client
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;

let openaiClient = null;

if (endpoint && apiKey) {
  try {
    openaiClient = new OpenAIClient(
      endpoint, 
      new AzureKeyCredential(apiKey)
    );
  } catch (error) {
    console.error('Error initializing Azure OpenAI client:', error);
  }
}

/**
 * Generate a text completion using Azure OpenAI
 * @param {string} prompt - The prompt to generate text from
 * @param {Object} options - Additional options for the request
 * @returns {Promise<string>} - The generated text
 */
async function generateText(prompt, options = {}) {
  if (!openaiClient) {
    throw new Error('Azure OpenAI client not configured');
  }

  const deploymentId = options.model === 'o3-mini' 
    ? process.env.AZURE_OPENAI_DEPLOYMENT_O3MINI 
    : process.env.AZURE_OPENAI_DEPLOYMENT_GPT4O;

  const defaultOptions = {
    maxTokens: 800,
    temperature: 0.7,
    topP: 0.95,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stop: null
  };

  const requestOptions = { ...defaultOptions, ...options };

  try {
    const response = await openaiClient.getChatCompletions(
      deploymentId,
      [
        { role: "system", content: options.systemMessage || "You are a helpful assistant." },
        { role: "user", content: prompt }
      ],
      requestOptions
    );

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating text with Azure OpenAI:', error);
    throw error;
  }
}

/**
 * Generate an embedding for text using Azure OpenAI
 * @param {string} text - The text to embed
 * @returns {Promise<Array<number>>} - The embedding vector
 */
async function generateEmbedding(text) {
  if (!openaiClient) {
    throw new Error('Azure OpenAI client not configured');
  }

  try {
    const response = await openaiClient.getEmbeddings(
      process.env.AZURE_OPENAI_DEPLOYMENT_EMBEDDING || "text-embedding-ada-002",
      [text]
    );

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding with Azure OpenAI:', error);
    throw error;
  }
}

module.exports = {
  generateText,
  generateEmbedding
};