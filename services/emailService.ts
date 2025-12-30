
import { GoogleGenAI } from "@google/genai";
import { Appointment, Service, User } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const EMAIL_SYSTEM_INSTRUCTION = `Sei l'ufficio relazioni esterne di "Kristal Atelier". 
Il tuo compito è scrivere email di conferma e aggiornamento per i "Ritual" di bellezza. 
Il tono deve essere estremamente raffinato, accogliente e professionale (Luxury Italian Style).
Usa un linguaggio evocativo. Firma sempre come "Il Team Kristal".`;

export type EmailType = 'confirmation' | 'update' | 'cancellation';

interface SendEmailParams {
  type: EmailType;
  appointment: Appointment;
  client: User | any;
  service?: Service;
  oldData?: any;
}

export async function sendLuxuryEmailNotification({ type, appointment, client, service, oldData }: SendEmailParams) {
  if (!client?.email) {
    console.warn("Email non inviata: Ospite senza indirizzo email valido.");
    return false;
  }

  const dateStr = new Date(appointment.date).toLocaleDateString('it-IT', { 
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' 
  });

  let prompt = "";
  if (type === 'confirmation') {
    prompt = `Scrivi un'email di conferma per l'ospite ${client.full_name} che ha prenotato il rituale "${service?.name}" per il giorno ${dateStr} con l'artista ${appointment.team_member_name}.`;
  } else if (type === 'update') {
    const oldDateStr = oldData?.date ? new Date(oldData.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'precedente';
    prompt = `Scrivi un'email di notifica modifica per l'ospite ${client.full_name}. Il suo rituale "${service?.name}" è stato spostato. Vecchio orario: ${oldDateStr}. Nuovo orario: ${dateStr}. Artista assegnato: ${appointment.team_member_name}.`;
  } else if (type === 'cancellation') {
    prompt = `Scrivi un'email di cancellazione raffinata per l'ospite ${client.full_name} per il rituale "${service?.name}" del giorno ${dateStr}. Esprimi il dispiacere e invita a prenotare una nuova sessione.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: EMAIL_SYSTEM_INSTRUCTION,
        temperature: 0.8,
      },
    });

    const emailContent = response.text;

    // Simulazione invio tramite API professionale (es. Resend, SendGrid)
    console.log(`%c[EMAIL SENDING to ${client.email}]`, "color: #d97706; font-weight: bold;");
    console.log(`Oggetto: Kristal Atelier - ${type === 'confirmation' ? 'Conferma Ritual' : type === 'update' ? 'Aggiornamento Agenda' : 'Cancellazione Sessione'}`);
    console.log(emailContent);

    // Qui andrebbe la chiamata fetch reale all'API di mailing
    // await fetch('https://api.resend.com/emails', { ... });

    return true;
  } catch (error) {
    console.error("Errore generazione email con Gemini:", error);
    return false;
  }
}
