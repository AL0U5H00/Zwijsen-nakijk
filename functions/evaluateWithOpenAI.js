const { default: axios } = require('axios');

module.exports = async function evaluateAnswers(qaPairs, studentName = '') {
  if (!Array.isArray(qaPairs)) throw new Error("qaPairs is geen array");

  const leerlingInput = qaPairs.map((qa, i) => {
    return `${i + 1}. Onderdeel: ${qa.vraag}\nLeerling: ${qa.antwoord}\nCorrect: ${qa.correctAntwoord || 'n.v.t.'}`;
  }).join('\n');

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
  "confidence": 0% - 100%        // gebruik de confidence score die vanuit de JSON-bestand komt
  "leerling": "..."              // naam van de leerling
}

Als een correct antwoord beschikbaar is, gebruik dit ter vergelijking.`.trim()
    },
    {
      role: 'user',
      content: `${studentName ? `Naam leerling: ${studentName}\n` : ''}Vragen en antwoorden:\n${leerlingInput}`
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