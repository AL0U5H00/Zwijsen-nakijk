const { default: axios } = require('axios');

module.exports = async function evaluateAnswers(qaPairs) {
  if (!Array.isArray(qaPairs)) throw new Error("qaPairs is geen array");

  const leerlingInput = qaPairs.map((qa, i) => `${i + 1}. Onderdeel: ${qa.vraag} Antwoord: ${qa.antwoord}`).join('\n');

  const prompt = [
    {
      role: 'system',
      content: `Je bent een nakijkassistent voor leerkrachten van het basisonderwijs.

Je ontvangt een lijst met antwoorden van een leerling, afkomstig van een papieren werkblad. Het werkblad bevat meerdere onderdelen:

1. Rekenopgaven in de vorm van een tabel met producten, prijzen, kortingen en het bedrag dat de leerling moet betalen. De eerste rij van deze tabel bevat de kolomnamen (zoals "Product", "Prijs", "Korting", "Ik betaal ..."). Deze koprij is géén antwoord en moet worden genegeerd.
2. Meerkeuzevragen waarbij aangekruiste of niet-aangekruiste opties genoteerd zijn
3. Een werkwoordentabel met meerdere rijen. Elke rij bevat een werkwoord in verschillende vormen: infinitief, tegenwoordige tijd, verleden tijd en voltooid deelwoord

Voor elk onderdeel geef je:
- of het antwoord correct is
- wat het gegeven antwoord was
- indien fout: een korte opmerking wat er mis is (bijvoorbeeld fout vervoegd, bedrag niet correct berekend, of geen optie aangekruist)
- hoe zeker je bent van je beoordeling (confidence score)

Gebruik voor elk onderdeel een JSON-object met exact deze structuur:
{
  "onderdeel": "...",           // de naam van het onderdeel (bijv. "Prijs voor kaas")
  "antwoord": "...",            // het antwoord dat de leerling gaf
  "correct": true of false,      // is het correct beoordeeld?
  "opmerking": "...",           // optioneel, alleen invullen bij fouten
  "confidence": 0.0 - 1.0        // getal tussen 0 (twijfel) en 1 (zeer zeker)
}

Let op:
- Geef geen uitleg voor de leerling, alleen voor de docent
- Beoordeel alleen echte antwoorden; kopregels of lege velden hoef je niet mee te nemen`.trim()
    },
    {
      role: 'user',
      content: `Vragen en antwoorden:\n${leerlingInput}`
    }
  ];

  const response = await axios.post(
    `${process.env.OPENAI_ENDPOINT}/openai/deployments/${process.env.OPENAI_DEPLOYMENT}/chat/completions?api-version=2025-01-01-preview`,
    {
      messages: prompt,
      temperature: 0.2
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.OPENAI_KEY
      }
    }
  );

  return response.data.choices[0].message.content;
};