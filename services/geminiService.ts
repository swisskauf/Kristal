
import { GoogleGenAI } from "@google/genai";
import { SERVICES } from "../constants";
import { User } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAIConsultation(userPrompt: string, userProfile?: User) {
  const serviceList = SERVICES.map(s => `${s.name} (${s.category}) - CHF ${s.price}`).join(', ');
  
  let historyContext = "";
  if (userProfile && userProfile.treatment_history && userProfile.treatment_history.length > 0) {
    historyContext = `L'ospite si chiama ${userProfile.fullName}. Storico: ${
      userProfile.treatment_history.slice(-2).map(h => `${h.service}`).join(', ')
    }.`;
  }

  const prompt = `Sei la Concierge AI di "Kristal", atelier di bellezza luxury.
  Servizi: ${serviceList}.
  Staff: Melk (Colore), Maurizio (Taglio), Romina (Estetica).
  
  ${historyContext}

  REGOLE DI RISPOSTA (MANDATORIE):
  1. Sii ESTREMAMENTE CONCISO: rispondi in massimo 3-4 frasi.
  2. Usa il grassetto (**) per evidenziare SERVIZI, PREZZI e MEMBRI DEL TEAM.
  3. Tono: Elegante, discreto, quasi sussurrato. Italiano impeccabile.
  4. Suggerisci UN solo servizio primario basandoti su: "${userPrompt}".
  5. Esempio: "Per la vostra esigenza suggerisco il **Balayage Luxury** (CHF 195). Sarà curato da **Melk** per garantire un risultato naturale e radioso."`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "La vostra bellezza merita silenzio e cura. Vi aspettiamo in atelier.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Un piccolo imprevisto nel rituale digitale. Siamo a vostra disposizione in atelier.";
  }
}
