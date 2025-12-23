
import { GoogleGenAI } from "@google/genai";
import { SERVICES } from "../constants";

// Fix: Initializing GoogleGenAI following the strictly required pattern using process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAIConsultation(userPrompt: string) {
  const serviceList = SERVICES.map(s => `${s.name} (${s.category}) - CHF ${s.price}`).join(', ');
  
  const prompt = `Sei l'assistente virtuale del salone di bellezza di lusso "Kristal".
  I nostri servizi disponibili sono: ${serviceList}.
  Il team è composto da Melk (Capelli/Colore), Maurizio (Capelli/Taglio) e Romina (Estetica/Viso/Corpo).
  
  Rispondi in modo elegante e professionale in ITALIANO.
  Suggerisci il servizio più adatto in base alla richiesta del cliente: "${userPrompt}".
  Spiega perché quel servizio è consigliato e quale membro del team dovrebbe occuparsene.
  Usa sempre la valuta CHF per i riferimenti ai prezzi.
  Sii sintetico ma accogliente.`;

  try {
    // Fix: Using generateContent with model and contents properties as required by the latest SDK.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Fix: Correctly accessing the .text property from GenerateContentResponse.
    return response.text || "Mi dispiace, al momento non riesco a connettermi al mio sistema di bellezza. Riprova tra poco.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Si è verificato un errore nella consulenza AI.";
  }
}

export async function analyzeAvailability(appointments: any[]) {
    const prompt = `Analizza questo set di appuntamenti per il salone Kristal e suggerisci i momenti migliori per fare una pausa o lanciare una promozione basata sui buchi in agenda. Appuntamenti: ${JSON.stringify(appointments)}`;
    
    try {
        // Fix: Using the correct generateContent structure and model name for text tasks.
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        // Fix: Correctly accessing the .text property from GenerateContentResponse.
        return response.text;
    } catch (error) {
        return "Analisi non disponibile.";
    }
}
