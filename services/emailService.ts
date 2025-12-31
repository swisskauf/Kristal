
import { GoogleGenAI } from "@google/genai";
import { Appointment, Service, User } from "../types";

const EMAIL_SYSTEM_INSTRUCTION = `Sei l'ufficio relazioni esterne di "Kristal Atelier". 
Il tuo compito è scrivere email di conferma e aggiornamento per i "Ritual" di bellezza. 
Il tono deve essere estremamente raffinato, accogliente e professionale (Luxury Italian Style).
Usa un linguaggio evocativo. Firma sempre come "Il Team Kristal".
Non includere l'oggetto nell'output, solo il corpo dell'email.`;

export type EmailType = 'confirmation' | 'update' | 'cancellation';

interface SendEmailParams {
  type: EmailType;
  appointment: Appointment;
  client: User | any;
  service?: Service;
  oldData?: any;
}

export async function sendLuxuryEmailNotification({ type, appointment, client, service, oldData }: SendEmailParams): Promise<string | null> {
  if (!client?.email) {
    console.warn("Email non inviata: Ospite senza indirizzo email valido.");
    return null;
  }

  // Inizializzazione Lazy e Sicura
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Email Service: API Key mancante. Generazione testo saltata.");
    return null;
  }

  const dateStr = new Date(appointment.date).toLocaleDateString('it-IT', { 
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' 
  });

  let prompt = "";
  if (type === 'confirmation') {
    prompt = `Scrivi un'email di conferma breve ma elegante per l'ospite ${client.full_name} che ha prenotato il rituale "${service?.name}" per il giorno ${dateStr} con l'artista ${appointment.team_member_name}.`;
  } else if (type === 'update') {
    const oldDateStr = oldData?.date ? new Date(oldData.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'precedente';
    prompt = `Scrivi un'email di notifica modifica breve per l'ospite ${client.full_name}. Il suo rituale "${service?.name}" è stato spostato. Vecchio orario: ${oldDateStr}. Nuovo orario: ${dateStr}. Artista assegnato: ${appointment.team_member_name}.`;
  } else if (type === 'cancellation') {
    prompt = `Scrivi un'email di cancellazione raffinata e breve per l'ospite ${client.full_name} per il rituale "${service?.name}" del giorno ${dateStr}. Esprimi il dispiacere e invita a prenotare una nuova sessione.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: EMAIL_SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const emailContent = response.text || "Impossibile generare il contenuto dell'email.";

    // Log per debug
    console.log(`%c[EMAIL SENDING to ${client.email}]`, "color: #d97706; font-weight: bold;");
    console.log(emailContent);

    return emailContent;
  } catch (error) {
    console.error("Errore generazione email con Gemini:", error);
    return null;
  }
}
