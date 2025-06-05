require('dotenv').config();
const listNewScans = require('./functions/triggerBlobUpload');
const analyze = require('./functions/analyzeWithFormRecognizer');
const poll = require('./functions/pollAnalysisResult');
const evaluateAnswers = require('./functions/evaluateWithOpenAI');
const save = require('./functions/saveEvaluationResult');

(async () => {
  const blobs = await listNewScans();

  for (const blobName of blobs) {
    const operationLocation = await analyze(blobName);
    const result = await poll(operationLocation);

    const docFields = result.analyzeResult.documents[0].fields;
    const qaPairs = [];

    // 1. Snelverkoop tabel
    if (docFields.Snelverkoop?.valueArray) {
      docFields.Snelverkoop.valueArray.forEach((item, i) => {
        const row = item?.valueObject;
        if (!row) return;

        const skipRow = Object.values(row).some(cell =>
          ['product', 'prijs', 'korting', 'ik betaal'].includes(cell?.content?.toLowerCase())
        );
        if (skipRow) return;

        const product = row['Product']?.content || `product ${i + 1}`;
        const velden = ['Prijs', 'Korting %', 'Korting', 'Ik betaal ...'];

        velden.forEach((veld) => {
          if (row[veld]?.content) {
            qaPairs.push({
              vraag: `${veld} voor ${product}`,
              antwoord: row[veld].content,
              confidence: row[veld].confidence || 1
            });
          }
        });
      });
    }

    // 2. Totaal korting
    if (docFields['Totaal snelverkoop']?.content) {
      qaPairs.push({
        vraag: 'Wat is het totaalbedrag aan korting?',
        antwoord: docFields['Totaal snelverkoop'].content,
        confidence: docFields['Totaal snelverkoop'].confidence || 1
      });
    }

    // 3. Werkwoordentabel
    if (docFields.Werkwoorden?.valueArray) {
      docFields.Werkwoorden.valueArray.forEach((rij, index) => {
        const row = rij?.valueObject;
        if (!row) return;

        Object.entries(row).forEach(([vorm, inhoud]) => {
          if (inhoud?.content) {
            qaPairs.push({
              vraag: `Werkwoord rij ${index + 1} - ${vorm}`,
              antwoord: inhoud.content,
              confidence: inhoud.confidence || 1
            });
          }
        });
      });
    }

    // 4. Meerkeuzevragen
    ['Kruis 1', 'Kruis 2', 'Kruis 3'].forEach((veld, index) => {
      const kruis = docFields[veld];
      if (kruis) {
        const aangekruist = kruis.valueType === 'selectionMark' && kruis.content === 'selected';
        qaPairs.push({
          vraag: `Meerkeuzeoptie ${index + 1}`,
          antwoord: aangekruist ? 'aangekruist' : 'niet aangekruist',
          confidence: kruis.confidence || 1
        });
      }
    });

    if (qaPairs.length === 0) {
      console.warn(`⚠ Geen vragen gevonden in ${blobName}`);
      continue;
    }

    const beoordeling = await evaluateAnswers(qaPairs);
    await save(blobName, beoordeling);
    console.log(`✔ Beoordeling opgeslagen voor ${blobName}`);
  }
})();