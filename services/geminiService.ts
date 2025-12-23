
import { GoogleGenAI } from "@google/genai";
import { SERVICES } from "../constants";
import { User } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAIConsultation(userPrompt: string, userProfile?: User) {
  const serviceList = SERVICES.map(s => `${s.name} (${s.category}) - CHF ${s.price}`).join(', ');
  
  let historyContext = "";
  if (userProfile && userProfile.treatment_history && userProfile.treatment_history.length > 0) {
    historyContext = `L'ospite si chiama ${userProfile.fullName}. Il suo storico trattamenti è: ${
      userProfile.treatment_history.map(h => `${h.date}: ${h.service} (${h.notes})`).join('; ')
    }.`;
  }

  const prompt = `Sei l'assistente virtuale del salone di bellezza di lusso "Kristal".
  I nostri servizi disponibili sono: ${serviceList}.
  Il team è composto da Melk (Direttore Creativo - Colore), Maurizio (Senior Stylist - Taglio) e Romina (Master Esthetician - Trattamenti Viso/Corpo).
  
  ${historyContext}

  REGOLE DI RISPOSTA:
  1. Rispondi in modo elegante, empatico e professionale in ITALIANO.
  2. Suggerisci il servizio più adatto basandoti sulla richiesta: "${userPrompt}".
  3. Se hai lo storico, usalo per fare riferimenti personali (es. "Vedo che hai amato il Balayage, oggi potremmo...").
  4. Spiega il valore del servizio (non solo il prezzo) e perché quel membro del team è la scelta ideale.
  5. Usa sempre la valuta CHF. 
  6. Sii sintetico, accogliente e usa un linguaggio da atelier di alta moda.
  7. Non essere mai tecnico in modo freddo, trasmetti passione e calore.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "Ogni ospite è per noi un'opera d'arte. Al momento non riesco a connettermi, ma il nostro team è pronto ad accoglierti.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Un piccolo imprevisto nella nostra consulenza digitale. Ma ricorda: in Kristal, la tua bellezza è la nostra missione prioritaria.";
  }
}
