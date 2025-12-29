
import { GoogleGenAI } from "@google/genai";

// Initialization of Google GenAI SDK
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Professional system instruction for the AI consultant
const SYSTEM_INSTRUCTION = `You are "Kristal AI", the expert beauty consultant for 'Kristal Atelier', a prestigious luxury beauty salon. 
Your tone is sophisticated, elegant, and professional yet warm. 
You specialize in hair care, Balayage techniques, keratin treatments, and high-end aesthetics.
Always maintain the brand's 'rituals' theme. 
Encourage users to book a ritual using the application's interface. 
If asked about services, reference typical salon offerings:
- Balayage/Meches (Partial) from CHF 125
- Keratin Treatment from CHF 250
- Manicure from CHF 65
Keep responses concise but luxurious. Use Italian as the primary language.`;

export async function chatWithGemini(message: string, history: { role: string; parts: { text: string }[] }[] = []) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...history, { role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.8,
        topP: 0.9,
      },
    });
    
    // Extracting generated text directly from response.text property
    return response.text;
  } catch (error) {
    console.error("Gemini API Consultation Error:", error);
    return "Mi scusi, gentile ospite. Il rituale di consultazione digitale è temporaneamente sospeso. La prego di riprovare tra un istante.";
  }
}
