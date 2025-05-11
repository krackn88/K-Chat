const { BlobServiceClient } = require('@azure/storage-blob');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Azure Blob Storage client
const blobServiceClient = process.env.AZURE_STORAGE_CONNECTION_STRING
  ? BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
  : null;

const containerName = process.env.AZURE_BLOB_CONTAINER || 'uploads';

/**
 * Upload a file to Azure Blob Storage
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} fileName - The name to save the file as
 * @returns {Promise<string>} - URL of the uploaded blob
 */
async function uploadFile(fileBuffer, fileName) {
  if (!blobServiceClient) {
    throw new Error('Azure Storage connection not configured');
  }

  try {
    // Get a reference to a container
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Create the container if it doesn't exist
    await containerClient.createIfNotExists();
    
    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    
    // Upload the file
    await blockBlobClient.upload(fileBuffer, fileBuffer.length);
    
    // Return the URL to access the blob
    return blockBlobClient.url;
  } catch (error) {
    console.error('Error uploading to Azure Blob Storage:', error);
    throw error;
  }
}

/**
 * Download a file from Azure Blob Storage
 * @param {string} fileName - The name of the file to download
 * @returns {Promise<Buffer>} - The file buffer
 */
async function downloadFile(fileName) {
  if (!blobServiceClient) {
    throw new Error('Azure Storage connection not configured');
  }

  try {
    // Get a reference to a container
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    
    // Download the blob to a buffer
    const downloadResponse = await blockBlobClient.download(0);
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }
    
    // Return the buffer
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error downloading from Azure Blob Storage:', error);
    throw error;
  }
}

/**
 * List all files in a container
 * @param {string} prefix - Optional prefix to filter files
 * @returns {Promise<Array<string>>} - Array of file names
 */
async function listFiles(prefix = '') {
  if (!blobServiceClient) {
    throw new Error('Azure Storage connection not configured');
  }

  try {
    // Get a reference to a container
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // List the blobs
    const files = [];
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      files.push(blob.name);
    }
    
    return files;
  } catch (error) {
    console.error('Error listing files from Azure Blob Storage:', error);
    throw error;
  }
}

/**
 * Delete a file from Azure Blob Storage
 * @param {string} fileName - The name of the file to delete
 * @returns {Promise<void>}
 */
async function deleteFile(fileName) {
  if (!blobServiceClient) {
    throw new Error('Azure Storage connection not configured');
  }

  try {
    // Get a reference to a container
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    
    // Delete the blob
    await blockBlobClient.delete();
  } catch (error) {
    console.error('Error deleting file from Azure Blob Storage:', error);
    throw error;
  }
}

module.exports = {
  uploadFile,
  downloadFile,
  listFiles,
  deleteFile
};