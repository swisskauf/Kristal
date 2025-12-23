
import { GoogleGenAI } from "@google/genai";
import { SERVICES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAIConsultation(userPrompt: string) {
  const serviceList = SERVICES.map(s => `${s.name} (${s.category}) - CHF ${s.price}`).join(', ');
  
  const prompt = `Sei l'assistente virtuale del salone di bellezza di lusso "Kristal".
  I nostri servizi disponibili sono: ${serviceList}.
  Il team è composto da Melk (Specialista Colore), Maurizio (Stylist Uomo) e Romina (Master Esthetician).
  
  Rispondi in modo elegante, empatico e professionale in ITALIANO.
  Suggerisci il servizio più adatto in base alla richiesta del cliente: "${userPrompt}".
  Spiega perché quel servizio è consigliato e quale membro del team è il più indicato.
  Usa sempre la valuta CHF. Sii sintetico, accogliente e usa un linguaggio da atelier di alta moda.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "La tua bellezza merita la massima attenzione. In questo momento non riesco a connettermi, ma ti aspettiamo in salone.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Si è verificato un piccolo imprevisto nella consulenza AI. Il nostro team è comunque a tua disposizione.";
  }
}
