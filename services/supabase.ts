import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabaseMock } from "./supabaseMock";

const getEnv = (key: string): string => {
  const v =
    (typeof import.meta !== "undefined" ? (import.meta as any).env?.[key] : "") ||
    (typeof window !== "undefined" ? (window as any)?.process?.env?.[key] : "");
  return (v ?? "").toString().trim();
};

const supabaseUrl = getEnv("VITE_SUPABASE_URL");
const supabaseAnonKey = getEnv("VITE_SUPABASE_ANON_KEY");

const isValidConfig =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  supabaseUrl.startsWith("https://") &&
  supabaseUrl !== "YOUR_SUPABASE_URL" &&
  supabaseUrl !== "undefined";

let client: SupabaseClient | null = null;
if (isValidConfig) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch (e) {
    console.error("Errore critico inizializzazione Supabase:", e);
  }
}

export const useMock = !client;

const normalizeWeekly = (w: any) => (Array.isArray(w) ? w.map((n) => Number(n)) : []);

export const db = {
  appointments: {
    getAll: async () => {
      try {
        if (useMock) {
          return supabaseMock.appointments.getAll();
        }
        const { data, error } = await client!.from("appointments").select("*, services(*), profiles(*)").order("date");
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error("Errore fetch appuntamenti da Supabase:", e);
        return supabaseMock.appointments.getAll();
      }
    },
    upsert: async (a: any) => {
      if (useMock) {
        console.log("Utilizzo modalità mock. Dati appuntamento:", a);
        const data = supabaseMock.appointments.upsert(a);
        return { data, error: null };
      }
      try {
        const { services, profiles, ...clean } = a;
        console.log("Salvataggio appuntamento Supabase: Payload inviato", clean);
        const { data, error } = await client!.from("appointments").upsert(clean).select().single();
        if (error || !data) {
          console.error("Errore durante il salvataggio di un appuntamento:", error);
          throw new Error("Salvataggio fallito o dati mancanti.");
        }
        return { data, error: null };
      } catch (e) {
        console.error("Errore fallback Supabase appointments.upsert:", e);
        const data = supabaseMock.appointments.upsert(a);
        return { data, error: null };
      }
    },
  },
};
