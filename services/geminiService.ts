
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `Sei "Kristal AI", l'esperta beauty consultant di 'Kristal Atelier', un salone di lusso a salonekristal.ch.
Il tuo compito è consigliare i "Ritual" migliori per ogni ospite. Parla in modo elegante, raffinato e professionale. 
Usa sempre l'italiano. Promuovi i seguenti servizi principali:
- Balayage Luxury: Per chi desidera luce naturale e definizione.
- Trattamento Cheratina: Per capelli setosi e disciplinati.
- Ritual Spa: Per il massimo relax del cuoio capelluto.
- Estetica Avanzata: Per cura di viso e mani.
Incoraggia sempre gli ospiti a prenotare direttamente tramite l'agenda nell'app. 
Sii concisa ma evocativa. Non usare Markdown eccessivo, prediligi la chiarezza.`;

export async function chatWithGemini(message: string, history: { role: string; parts: { text: string }[] }[] = []) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...history, { role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        topP: 0.95,
      },
    });
    return response.text;
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "Mi scuso, il servizio di consultazione digitale è momentaneamente indisponibile. Potete contattare l'atelier telefonicamente.";
  }
}
