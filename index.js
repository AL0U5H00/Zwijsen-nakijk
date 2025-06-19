require('dotenv').config();
const { BlobServiceClient } = require('@azure/storage-blob');
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

function extractLocation(field) {
  const region = field?.boundingRegions?.[0];
  if (!region) return null;
  return {
    page: region.pageNumber,
    polygon: region.polygon || region.boundingPolygon || null
  };
}

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING
);
const resultsContainer = blobServiceClient.getContainerClient(
  process.env.BLOB_CONTAINER_RESULTS
);

async function isAlreadyProcessed(blobName) {
  const fileName = `beoordeling-${blobName.replace(/\.[^/.]+$/, '')}.json`;
  const blobClient = resultsContainer.getBlobClient(fileName);
  return await blobClient.exists();
}

(async () => {
  const blobs = await listNewScans();

  for (const blobName of blobs) {
    if (await isAlreadyProcessed(blobName)) {
      console.log(`⏭ ${blobName} is al verwerkt, overslaan.`);
      continue;
    }
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
              locatie: extractLocation(row[veld]),
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
        locatie: extractLocation(docFields['Totaal snelverkoop']),
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
              locatie: extractLocation(inhoud),
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
          locatie: extractLocation(kruis),
          confidence: kruis.confidence || 1
        });
      }
    });

    if (qaPairs.length === 0) {
      console.warn(`⚠ Geen vragen gevonden in ${blobName}`);
      continue;
    }

    const beoordeling = await evaluateAnswers(qaPairs, studentName);

    // Voeg locatie en correcte antwoord toe aan de evaluatie
    beoordeling.forEach((item, idx) => {
      if (idx === 0) return; // eerste item bevat enkel leerlingnaam
      const qa = qaPairs[idx - 1];
      item.locatie = qa.locatie;
      item.correctAntwoord = qa.correctAntwoord;
    });

    await save(blobName, JSON.stringify(beoordeling, null, 2));
    console.log(`✔ Beoordeling opgeslagen voor ${blobName}`);
  }
})();
