const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Azure Cognitive Search client
const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
const searchKey = process.env.AZURE_SEARCH_KEY;
const searchIndex = process.env.AZURE_SEARCH_INDEX;

let searchClient = null;

if (searchEndpoint && searchKey && searchIndex) {
  try {
    searchClient = new SearchClient(
      searchEndpoint,
      searchIndex,
      new AzureKeyCredential(searchKey)
    );
  } catch (error) {
    console.error('Error initializing Azure Search client:', error);
  }
}

/**
 * Search for documents in Azure Cognitive Search
 * @param {string} query - The search query
 * @param {Object} options - Search options
 * @returns {Promise<Array<Object>>} - Search results
 */
async function searchDocuments(query, options = {}) {
  if (!searchClient) {
    throw new Error('Azure Search client not configured');
  }

  const defaultOptions = {
    top: 10,
    skip: 0,
    includeTotalCount: true,
    filters: '',
    facets: [],
    orderBy: []
  };

  const searchOptions = { ...defaultOptions, ...options };

  try {
    const searchResults = await searchClient.search(query, searchOptions);
    
    const results = [];
    for await (const result of searchResults.results) {
      results.push(result.document);
    }
    
    return results;
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
}

/**
 * Index a document in Azure Cognitive Search
 * @param {Object} document - The document to index
 * @returns {Promise<Object>} - Result of indexing operation
 */
async function indexDocument(document) {
  if (!searchClient) {
    throw new Error('Azure Search client not configured');
  }

  try {
    return await searchClient.indexDocuments([{ document }]);
  } catch (error) {
    console.error('Error indexing document:', error);
    throw error;
  }
}

/**
 * Delete a document from Azure Cognitive Search
 * @param {string} key - The document key
 * @returns {Promise<Object>} - Result of delete operation
 */
async function deleteDocument(key) {
  if (!searchClient) {
    throw new Error('Azure Search client not configured');
  }

  try {
    return await searchClient.deleteDocuments([{ key }]);
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

module.exports = {
  searchDocuments,
  indexDocument,
  deleteDocument
};