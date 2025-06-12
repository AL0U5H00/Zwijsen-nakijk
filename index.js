require('dotenv').config();
const listNewScans = require('./functions/triggerBlobUpload');
const analyze = require('./functions/analyzeWithFormRecognizer');
const poll = require('./functions/pollAnalysisResult');
const evaluateAnswers = require('./functions/evaluateWithOpenAI');
const save = require('./functions/saveEvaluationResult');
const getCorrectAnswers = require('./functions/getCorrectAnswers');
const saveFRresult = require('./functions/saveFRresult');

function extractStudentName(fields) {
  const opties = ['Leerling', 'Naam', 'Naam leerling', 'Leerlingnaam'];
  for (const key of opties) {
    if (fields[key]?.content) return fields[key].content;
  }
  return '';
}

(async () => {
  const blobs = await listNewScans();

  for (const blobName of blobs) {
    const operationLocation = await analyze(blobName);
    const result = await poll(operationLocation);
    await saveFRresult(blobName, result);

    const correctModel = await getCorrectAnswers();

    const docFields = result.analyzeResult.documents[0].fields;
    const studentName = extractStudentName(docFields);
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
              correctAntwoord: correctModel?.[`${veld} voor ${product}`] || null,
              confidence: row[veld].confidence || 1
            });
          }
        });
      });
    }

    // 2. Totaal korting
    if (docFields['Totaal snelverkoop']?.content) {
      const vraag = 'Wat is het totaalbedrag aan korting?';
      qaPairs.push({
        vraag,
        antwoord: docFields['Totaal snelverkoop'].content,
        correctAntwoord: correctModel?.[vraag] || null,
        confidence: docFields['Totaal snelverkoop'].confidence || 1
      });
    }

    // 3. Werkwoordentabel
    if (docFields.Werkwoorden?.valueArray) {
      docFields.Werkwoorden.valueArray.forEach((rij, index) => {
        const row = rij?.valueObject;
        if (!row) return;

        const skipRow = Object.values(row).some(cell =>
          ['infinitief', 'tegenwoordige tijd', 'verleden tijd', 'voltooid deelwoord']
            .includes(cell?.content?.toLowerCase())
        );
        if (skipRow) return;

        Object.entries(row).forEach(([vorm, inhoud]) => {
          if (inhoud?.content) {
            const vraag = `Werkwoord rij ${index + 1} - ${vorm}`;
            qaPairs.push({
              vraag,
              antwoord: inhoud.content,
              correctAntwoord: correctModel?.[vraag] || null,
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
        const vraag = `Meerkeuzeoptie ${index + 1}`;
        qaPairs.push({
          vraag,
          antwoord: aangekruist ? 'aangekruist' : 'niet aangekruist',
          correctAntwoord: correctModel?.[vraag] || null,
          confidence: kruis.confidence || 1
        });
      }
    });

    if (qaPairs.length === 0) {
      console.warn(`⚠ Geen vragen gevonden in ${blobName}`);
      continue;
    }

    const beoordeling = await evaluateAnswers(qaPairs, studentName);
    await save(blobName, beoordeling);
    console.log(`✔ Beoordeling opgeslagen voor ${blobName}`);
  }
})();