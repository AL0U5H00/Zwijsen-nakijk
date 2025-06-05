const axios = require('axios');

module.exports = async function pollAnalysis(operationLocation) {
  let status = '';
  let result;

  do {
    await new Promise(res => setTimeout(res, 5000));

    const response = await axios.get(operationLocation, {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.FORM_RECOGNIZER_KEY,
      },
    });

    status = response.data.status;
    result = response.data;

    console.log(`📡 Status Form Recognizer: ${status}`);
  } while (status !== 'succeeded' && status !== 'failed');

  if (status === 'failed') {
    throw new Error("❌ Form Recognizer-analyse is mislukt.");
  }

  return result;
};
