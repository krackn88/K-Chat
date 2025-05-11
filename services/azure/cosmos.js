const { CosmosClient } = require('@azure/cosmos');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Azure Cosmos DB client
const cosmosClient = process.env.COSMOS_URL && process.env.COSMOS_KEY
  ? new CosmosClient({
      endpoint: process.env.COSMOS_URL,
      key: process.env.COSMOS_KEY
    })
  : null;

const databaseId = process.env.COSMOS_DB;
const containerId = process.env.COSMOS_CONTAINER;

let container = null;

if (cosmosClient && databaseId && containerId) {
  try {
    const database = cosmosClient.database(databaseId);
    container = database.container(containerId);
  } catch (error) {
    console.error('Error initializing Cosmos DB container:', error);
  }
}

/**
 * Create or update an item in Cosmos DB
 * @param {Object} item - The item to create or update
 * @returns {Promise<Object>} - The created or updated item
 */
async function upsertItem(item) {
  if (!container) {
    throw new Error('Cosmos DB container not configured');
  }

  try {
    const { resource } = await container.items.upsert(item);
    return resource;
  } catch (error) {
    console.error('Error upserting item to Cosmos DB:', error);
    throw error;
  }
}

/**
 * Get an item by id from Cosmos DB
 * @param {string} id - The id of the item
 * @param {string} partitionKey - The partition key value
 * @returns {Promise<Object>} - The requested item
 */
async function getItem(id, partitionKey) {
  if (!container) {
    throw new Error('Cosmos DB container not configured');
  }

  try {
    const { resource } = await container.item(id, partitionKey).read();
    return resource;
  } catch (error) {
    if (error.code === 404) {
      return null;
    }
    console.error('Error reading item from Cosmos DB:', error);
    throw error;
  }
}

/**
 * Query items from Cosmos DB
 * @param {string} query - The SQL query
 * @param {Array} parameters - Query parameters
 * @returns {Promise<Array<Object>>} - Array of matching items
 */
async function queryItems(query, parameters = []) {
  if (!container) {
    throw new Error('Cosmos DB container not configured');
  }

  try {
    const { resources } = await container.items.query({
      query,
      parameters
    }).fetchAll();
    
    return resources;
  } catch (error) {
    console.error('Error querying items from Cosmos DB:', error);
    throw error;
  }
}

/**
 * Delete an item from Cosmos DB
 * @param {string} id - The id of the item
 * @param {string} partitionKey - The partition key value
 * @returns {Promise<void>}
 */
async function deleteItem(id, partitionKey) {
  if (!container) {
    throw new Error('Cosmos DB container not configured');
  }

  try {
    await container.item(id, partitionKey).delete();
  } catch (error) {
    console.error('Error deleting item from Cosmos DB:', error);
    throw error;
  }
}

module.exports = {
  upsertItem,
  getItem,
  queryItems,
  deleteItem
};