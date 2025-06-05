const axios = require('axios');

module.exports = async function analyzeDocument(blobName) {
  const url = `https://${process.env.STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${process.env.BLOB_CONTAINER_SCANS}/${blobName}`;

  const response = await axios.post(
    `${process.env.FORM_RECOGNIZER_ENDPOINT}/documentintelligence/documentModels/${process.env.FORM_RECOGNIZER_MODEL_ID}:analyze?api-version=2024-11-30`,
    { urlSource: url },
    {
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.FORM_RECOGNIZER_KEY,
      },
    }
  );

  if (!response.headers['operation-location']) {
    throw new Error("❌ Geen operation-location ontvangen. Controleer model ID of endpoint.");
  }

  return response.headers['operation-location'];
};
