const { BlobServiceClient } = require('@azure/storage-blob');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');

// Create the BlobServiceClient object with connection string
const blobServiceClient = BlobServiceClient.fromConnectionString(
  config.azure.storageConnectionString
);

// Get a reference to a container
const containerClient = blobServiceClient.getContainerClient(
  config.azure.blobContainer
);

/**
 * Upload a file to Azure Blob Storage
 * @param {string} filePath - Local path to the file
 * @param {string} blobName - Name to use for the blob (file in storage)
 * @returns {Promise<string>} - URL of the uploaded blob
 */
const uploadFile = async (filePath, blobName) => {
  try {
    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Upload file
    const data = fs.readFileSync(filePath);
    const uploadResponse = await blockBlobClient.upload(data, data.length);
    
    console.log(`File ${filePath} uploaded successfully to ${blobName}`);
    
    // Return the URL to the blob
    return blockBlobClient.url;
  } catch (error) {
    console.error(`Error uploading file to Azure Blob Storage: ${error.message}`);
    throw error;
  }
};

/**
 * Upload a buffer directly to Azure Blob Storage
 * @param {Buffer} buffer - The buffer containing file data
 * @param {string} blobName - Name to use for the blob (file in storage)
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} - URL of the uploaded blob
 */
const uploadBuffer = async (buffer, blobName, contentType) => {
  try {
    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Set the content type
    const options = {
      blobHTTPHeaders: {
        blobContentType: contentType
      }
    };
    
    // Upload buffer
    const uploadResponse = await blockBlobClient.upload(buffer, buffer.length, options);
    
    console.log(`Buffer uploaded successfully to ${blobName}`);
    
    // Return the URL to the blob
    return blockBlobClient.url;
  } catch (error) {
    console.error(`Error uploading buffer to Azure Blob Storage: ${error.message}`);
    throw error;
  }
};

/**
 * Download a file from Azure Blob Storage
 * @param {string} blobName - Name of the blob to download
 * @param {string} downloadPath - Local path to save the downloaded file
 * @returns {Promise<string>} - Path to the downloaded file
 */
const downloadFile = async (blobName, downloadPath) => {
  try {
    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Create the download directory if it doesn't exist
    const downloadDir = path.dirname(downloadPath);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    // Download the blob to a local file
    const downloadResponse = await blockBlobClient.downloadToFile(downloadPath);
    
    console.log(`File ${blobName} downloaded successfully to ${downloadPath}`);
    
    // Return the path to the downloaded file
    return downloadPath;
  } catch (error) {
    console.error(`Error downloading file from Azure Blob Storage: ${error.message}`);
    throw error;
  }
};

/**
 * Delete a blob from storage
 * @param {string} blobName - Name of the blob to delete
 * @returns {Promise<void>}
 */
const deleteBlob = async (blobName) => {
  try {
    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Delete the blob
    const deleteResponse = await blockBlobClient.delete();
    
    console.log(`Blob ${blobName} deleted successfully`);
  } catch (error) {
    console.error(`Error deleting blob from Azure Blob Storage: ${error.message}`);
    throw error;
  }
};

/**
 * List all blobs in the container
 * @returns {Promise<Array>} - Array of blob items
 */
const listBlobs = async () => {
  try {
    const blobs = [];
    
    // List all blobs in the container
    for await (const blob of containerClient.listBlobsFlat()) {
      blobs.push({
        name: blob.name,
        contentType: blob.properties.contentType,
        createdOn: blob.properties.createdOn,
        lastModified: blob.properties.lastModified,
        contentLength: blob.properties.contentLength
      });
    }
    
    return blobs;
  } catch (error) {
    console.error(`Error listing blobs from Azure Blob Storage: ${error.message}`);
    throw error;
  }
};

module.exports = {
  uploadFile,
  uploadBuffer,
  downloadFile,
  deleteBlob,
  listBlobs
};
