const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function saveResult(blobName, content) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient(process.env.BLOB_CONTAINER_RESULTS);

  // Bestandsnaam op basis van originele blob, maar .json
  const fileName = `beoordeling-${blobName.replace(/\.[^/.]+$/, "")}.json`;

  const blockBlobClient = containerClient.getBlockBlobClient(fileName);

  await blockBlobClient.upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: "application/json" }
  });

  console.log(`💾 Beoordeling opgeslagen als: ${fileName}`);
};
