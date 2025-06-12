const { BlobServiceClient } = require('@azure/storage-blob');

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const container = blobServiceClient.getContainerClient('werkblad');

module.exports = async function getCorrectAnswers() {
  const blockBlob = container.getBlockBlobClient('Werkblad.json');

  try {
    const download = await blockBlob.downloadToBuffer();
    return JSON.parse(download.toString());
  } catch (err) {
    console.warn(`⚠ Kon Werkblad.json niet ophalen`);
    return null;
  }
};