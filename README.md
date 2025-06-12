# Zwijsen Nakijk Flow

Dit project automatiseert het nakijken van ingescande werkbladen. De workflow bestaat uit drie hoofdonderdelen:

1. **Scans analyseren met Azure Document Intelligence** – het systeem leest de ingescande bladen en haalt de antwoorden eruit.
2. **Evaluatie via OpenAI** – de gevonden antwoorden worden vergeleken met de juiste antwoorden zodat je direct ziet wat goed of fout is.
3. **Opslag in Azure Blob Storage** – zowel de ruwe resultaten als de evaluaties worden in een opslagcontainer bewaard.

## Installatie

1. Zorg dat [Node.js](https://nodejs.org/) is geïnstalleerd.
2. Download de broncode van deze repository.
3. Installeer de afhankelijkheden:
   ```bash
   npm install
   ```
4. Start het project:
   ```bash
   npm start
   ```

## Vereist `.env`‑bestand

In de hoofdmap staat een `.env`‑bestand waarin alle gevoelige gegevens worden bewaard. Voeg de volgende variabelen toe:

```
AZURE_STORAGE_CONNECTION_STRING=
STORAGE_ACCOUNT_NAME=
BLOB_CONTAINER_SCANS=
BLOB_CONTAINER_RESULTS=
FORM_RECOGNIZER_ENDPOINT=
FORM_RECOGNIZER_MODEL_ID=
FORM_RECOGNIZER_KEY=
OPENAI_ENDPOINT=
OPENAI_DEPLOYMENT=
OPENAI_KEY=
```

### Beschrijving van de variabelen
- **AZURE_STORAGE_CONNECTION_STRING** – verbinding met het Azure Storage account.
- **STORAGE_ACCOUNT_NAME** – de naam van je opslagaccount.
- **BLOB_CONTAINER_SCANS** – container voor de geüploade scans.
- **BLOB_CONTAINER_RESULTS** – container voor de evaluaties en andere uitvoer.
- **FORM_RECOGNIZER_ENDPOINT** – endpoint van je Document Intelligence resource.
- **FORM_RECOGNIZER_MODEL_ID** – ID van het model dat de scans analyseert.
- **FORM_RECOGNIZER_KEY** – toegangssleutel voor Document Intelligence.
- **OPENAI_ENDPOINT** – endpoint van de OpenAI resource.
- **OPENAI_DEPLOYMENT** – naam van de deployment binnen OpenAI.
- **OPENAI_KEY** – sleutel voor toegang tot OpenAI.

## Mappen en belangrijkste bestanden

```
.
├── index.js                # Startpunt van het script
├── functions/              # Losse functies voor de workflow
│   ├── analyzeWithFormRecognizer.js  # Start analyse in Document Intelligence
│   ├── pollAnalysisResult.js         # Wacht op het analyse-resultaat
│   ├── saveFRresult.js               # Sla het analyse-bestand op
│   ├── triggerBlobUpload.js          # Lees nieuwe scans uit Blob Storage
│   ├── getCorrectAnswers.js          # Haal de juiste antwoorden op
│   ├── evaluateWithOpenAI.js         # Vergelijk antwoorden via OpenAI
│   └── saveEvaluationResult.js       # Sla de beoordeling op
```

## Licentie

Dit project valt onder de **MIT-licentie** zoals aangegeven in `package.json`.

