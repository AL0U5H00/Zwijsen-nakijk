const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function listNewScans() {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient(process.env.BLOB_CONTAINER_SCANS);

  const blobs = [];
  for await (const blob of containerClient.listBlobsFlat()) {
    blobs.push(blob.name);
  }

  return blobs;
};
