/**
 * Utility functions for integrating with Azure services
 */
const { BlobServiceClient } = require('@azure/storage-blob');
const { CosmosClient } = require('@azure/cosmos');
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
const { SearchClient, SearchIndexClient, AzureKeyCredential: SearchCredential } = require('@azure/search-documents');

/**
 * Initialize Azure Blob Storage client
 * @returns {BlobServiceClient}
 */
const initBlobServiceClient = () => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connectionString) {
    console.warn('Azure Storage connection string not provided.');
    return null;
  }
  
  try {
    return BlobServiceClient.fromConnectionString(connectionString);
  } catch (error) {
    console.error('Error initializing Blob Service Client:', error);
    return null;
  }
};

/**
 * Initialize Azure Cosmos DB client
 * @returns {CosmosClient}
 */
const initCosmosClient = () => {
  const endpoint = process.env.COSMOS_URL;
  const key = process.env.COSMOS_KEY;
  
  if (!endpoint || !key) {
    console.warn('Cosmos DB endpoint or key not provided.');
    return null;
  }
  
  try {
    return new CosmosClient({ endpoint, key });
  } catch (error) {
    console.error('Error initializing Cosmos Client:', error);
    return null;
  }
};

/**
 * Initialize Azure OpenAI client
 * @returns {OpenAIClient}
 */
const initOpenAIClient = () => {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  
  if (!endpoint || !apiKey) {
    console.warn('Azure OpenAI endpoint or API key not provided.');
    return null;
  }
  
  try {
    return new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
  } catch (error) {
    console.error('Error initializing OpenAI Client:', error);
    return null;
  }
};

/**
 * Initialize Azure Cognitive Search client
 * @returns {SearchClient}
 */
const initSearchClient = () => {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const apiKey = process.env.AZURE_SEARCH_KEY;
  const indexName = process.env.AZURE_SEARCH_INDEX;
  
  if (!endpoint || !apiKey || !indexName) {
    console.warn('Azure Search endpoint, key, or index name not provided.');
    return null;
  }
  
  try {
    return new SearchClient(
      endpoint, 
      indexName, 
      new SearchCredential(apiKey)
    );
  } catch (error) {
    console.error('Error initializing Search Client:', error);
    return null;
  }
};

/**
 * Upload a file to Azure Blob Storage
 * @param {Buffer} fileBuffer - The file content
 * @param {string} fileName - The name to give the file
 * @returns {Promise<string>} - URL of the uploaded file
 */
const uploadToBlob = async (fileBuffer, fileName) => {
  const blobServiceClient = initBlobServiceClient();
  
  if (!blobServiceClient) {
    throw new Error('Blob service client not initialized');
  }
  
  const containerName = process.env.AZURE_BLOB_CONTAINER;
  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  // Generate unique name to avoid collisions
  const uniqueFileName = `${Date.now()}-${fileName}`;
  const blockBlobClient = containerClient.getBlockBlobClient(uniqueFileName);
  
  await blockBlobClient.upload(fileBuffer, fileBuffer.length);
  
  return blockBlobClient.url;
};

/**
 * Send a message to Azure OpenAI for processing
 * @param {string} message - The message to process
 * @param {string} deploymentId - The deployment ID to use
 * @returns {Promise<string>} - AI response
 */
const getAIResponse = async (message, deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_GPT4O) => {
  const client = initOpenAIClient();
  
  if (!client) {
    throw new Error('OpenAI client not initialized');
  }
  
  const response = await client.getChatCompletions(
    deploymentId,
    [
      { role: "system", content: "You are a helpful assistant in a messaging application." },
      { role: "user", content: message }
    ],
    { temperature: 0.7, maxTokens: 800 }
  );
  
  return response.choices[0].message.content;
};

module.exports = {
  initBlobServiceClient,
  initCosmosClient,
  initOpenAIClient,
  initSearchClient,
  uploadToBlob,
  getAIResponse
};
