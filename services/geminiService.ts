
import { GoogleGenAI } from "@google/genai";
import { SERVICES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAIConsultation(userPrompt: string) {
  const serviceList = SERVICES.map(s => `${s.name} (${s.category}) - CHF ${s.price}`).join(', ');
  
  const prompt = `Sei l'assistente virtuale del salone di bellezza di lusso "Kristal".
  I nostri servizi disponibili sono: ${serviceList}.
  Il team è composto da Melk (Direttore Creativo - Colore), Maurizio (Senior Stylist - Taglio) e Romina (Master Esthetician - Trattamenti Viso/Corpo).
  
  REGOLE DI RISPOSTA:
  1. Rispondi in modo elegante, empatico e professionale in ITALIANO.
  2. Suggerisci il servizio più adatto basandoti sulla richiesta: "${userPrompt}".
  3. Spiega il valore del servizio (non solo il prezzo) e perché quel membro del team è la scelta ideale.
  4. Usa sempre la valuta CHF. 
  5. Sii sintetico, accogliente e usa un linguaggio da atelier di alta moda.
  6. Non essere mai tecnico in modo freddo, trasmetti passione e calore.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "La tua bellezza merita la massima attenzione. In questo momento non riesco a connettermi, ma ti aspettiamo nel calore del nostro atelier.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Si è verificato un piccolo imprevisto nella nostra consulenza digitale. Ma ricorda: in Kristal, ogni ospite è unico e troveremo insieme il tuo stile.";
  }
}
