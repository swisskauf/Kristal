import { GoogleGenAI } from "@google/genai";
import { SERVICES } from "../constants";
import { User } from "../types";

const getApiKey = () =>
  (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_GEMINI_API_KEY : '') ||
  (typeof window !== 'undefined' ? (window as any)?.process?.env?.VITE_GEMINI_API_KEY : '') ||
  '';

export async function getAIConsultation(userPrompt: string, userProfile?: User) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Gemini API key mancante: restituisco risposta di fallback.");
    return "Siamo qui per voi. Prenotate un Ritual e vi accogliamo in atelier con una consulenza dedicata.";
  }

  const ai = new GoogleGenAI({ apiKey });
  const serviceList = SERVICES.map(s => `${s.name} (${s.category}) - CHF ${s.price}`).join(', ');

  let historyContext = "";
  if (userProfile?.treatment_history?.length) {
    historyContext = `L'ospite si chiama ${userProfile.fullName}. Storico trattamenti: ${
      userProfile.treatment_history.slice(-2).map(h => `${h.service}`).join(', ')
    }.`;
  }

  const systemInstruction = `Sei la Concierge AI di "Kristal", atelier di bellezza luxury a salonekristal.ch.
  Menu Servizi: ${serviceList}.
  Staff: Melk (Colorista Creativo), Maurizio (Senior Stylist), Romina (Master Esthetician).
  
  ${historyContext}

  REGOLE DI RISPOSTA:
  1. Tono: Sofisticato, accogliente, professionale.
  2. Rispondi in modo CONCISO (max 3-4 frasi).
  3. Usa il grassetto (**) per SERVIZI, PREZZI e MEMBRI DEL TEAM.
  4. Se l'utente chiede trend o informazioni esterne, usa Google Search per fornire risposte verificate.
  5. Se il cliente sembra interessato, invita a prenotare un Ritual direttamente in app.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.0-flash', // versione stabile
      contents: [{ parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }]
      }
    });

    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let text = response.text || "La vostra bellezza merita silenzio e cura. Vi aspettiamo in atelier.";
    
    if (grounding?.length) {
      const sources = grounding
        .map((chunk: any) => chunk.web)
        .filter(Boolean)
        .map((web: any) => `\n- [${web.title}](${web.uri})`)
        .join('');
      if (sources) text += `\n\nFonti ed approfondimenti:${sources}`;
    }

    return text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Siamo a vostra completa disposizione per una consulenza personalizzata direttamente in atelier.";
  }
}
