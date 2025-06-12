const { BlobServiceClient } = require('@azure/storage-blob');
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const container = blobServiceClient.getContainerClient('uitwerkingdocs');

module.exports = async function saveFRresult(blobName, result) {
  const fileName = `fr-output-${blobName.replace(/\.[^.]+$/, '')}.json`;
  const content = JSON.stringify(result, null, 2);
  await container.uploadBlockBlob(fileName, content, Buffer.byteLength(content));
};