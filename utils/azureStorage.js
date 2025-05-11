const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create the BlobServiceClient
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_BLOB_CONTAINER;

let blobServiceClient;
let containerClient;

// Initialize Azure Blob Storage
const initBlobService = () => {
  try {
    if (!connectionString) {
      console.warn('Azure Storage connection string not found. File storage will be unavailable.');
      return false;
    }

    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
    
    console.log('Azure Blob Storage initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Azure Blob Storage:', error);
    return false;
  }
};

// Upload a file to Azure Blob Storage
const uploadFile = async (filename, content, contentType) => {
  try {
    if (!containerClient) {
      const initialized = initBlobService();
      if (!initialized) return null;
    }

    const blockBlobClient = containerClient.getBlockBlobClient(filename);

    // Upload content
    const uploadResponse = await blockBlobClient.upload(content, content.length, {
      blobHTTPHeaders: { blobContentType: contentType }
    });

    return {
      filename,
      url: blockBlobClient.url,
      success: true
    };
  } catch (error) {
    console.error('Error uploading file to Azure Blob Storage:', error);
    return {
      filename,
      success: false,
      error: error.message
    };
  }
};

// Download a file from Azure Blob Storage
const downloadFile = async (filename) => {
  try {
    if (!containerClient) {
      const initialized = initBlobService();
      if (!initialized) return null;
    }

    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    const downloadResponse = await blockBlobClient.download(0);

    // Convert the downloaded response to a buffer
    const downloaded = await streamToBuffer(downloadResponse.readableStreamBody);

    return {
      filename,
      content: downloaded,
      success: true
    };
  } catch (error) {
    console.error('Error downloading file from Azure Blob Storage:', error);
    return {
      filename,
      success: false,
      error: error.message
    };
  }
};

// Delete a file from Azure Blob Storage
const deleteFile = async (filename) => {
  try {
    if (!containerClient) {
      const initialized = initBlobService();
      if (!initialized) return null;
    }

    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    const deleteResponse = await blockBlobClient.delete();

    return {
      filename,
      success: true
    };
  } catch (error) {
    console.error('Error deleting file from Azure Blob Storage:', error);
    return {
      filename,
      success: false,
      error: error.message
    };
  }
};

// Helper function to convert a readable stream to a buffer
async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}

module.exports = {
  initBlobService,
  uploadFile,
  downloadFile,
  deleteFile
};
