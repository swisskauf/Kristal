
import { createClient } from '@supabase/supabase-js';
import { supabaseMock } from './supabaseMock';

// Estrazione sicura delle variabili d'ambiente (Vite + Vercel)
const getEnv = (key: string): string => {
  if (typeof window === 'undefined') return '';
  // @ts-ignore
  const v = (import.meta.env?.[key]) || (window.process?.env?.[key]) || '';
  return String(v).trim();
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Verifica se le chiavi sono autentiche (non segnaposto o undefined)
const isValidConfig = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseUrl !== 'undefined';

// Inizializzazione condizionale
let client: any = null;
if (isValidConfig) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error("Errore critico inizializzazione Supabase:", e);
  }
}

export const useMock = !client;

/**
 * Fallback Auth: garantisce che ogni metodo esista sempre
 */
const mockAuth = {
  getSession: async () => ({ data: { session: supabaseMock.auth.getUser() ? { user: supabaseMock.auth.getUser() } : null }, error: null }),
  onAuthStateChange: (cb: any) => {
    const user = supabaseMock.auth.getUser();
    if (user) setTimeout(() => cb('SIGNED_IN', { user }), 0);
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  signInWithPassword: async ({ email }: any) => {
    const user = { id: 'mock-user', email, fullName: 'Ospite Kristal', role: 'client' };
    supabaseMock.auth.signIn(user as any);
    return { data: { user, session: {} }, error: null };
  },
  signUp: async () => ({ 
    data: { user: null, session: null }, 
    error: { message: "Database non configurato. Configura le variabili VITE_SUPABASE su Vercel per abilitare le registrazioni reali." } 
  }),
  signInWithOAuth: async () => ({ data: { url: null }, error: { message: "OAuth non disponibile in modalità Demo." } }),
  signOut: async () => { supabaseMock.auth.signOut(); return { error: null }; }
};

/**
 * Export unificato del client
 */
export const supabase = client || {
  auth: mockAuth,
  from: (table: string) => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: null, error: null }), single: async () => ({ data: null, error: null }) }),
      order: () => ({ data: [], error: null })
    }),
    insert: async () => ({ data: null, error: null }),
    upsert: async () => ({ data: null, error: null }),
    delete: async () => ({ data: null, error: null }),
    update: async () => ({ data: null, error: null })
  })
};

// Log di stato per il debug in console
if (useMock) {
  console.warn("💎 KRISTAL: Modalità DEMO attiva (Database locale).");
} else {
  console.log("💎 KRISTAL: Database REALE connesso.");
}

/**
 * Wrapper Database per astrazione tabelle
 */
export const db = {
  profiles: {
    getAll: async () => useMock ? supabaseMock.profiles.getAll() : (await client.from('profiles').select('*').order('full_name')).data || [],
    get: async (id: string) => {
      if (useMock) return (supabaseMock.profiles.getAll() as any[]).find(p => p.id === id) || null;
      return (await client.from('profiles').select('*').eq('id', id).maybeSingle()).data;
    },
    upsert: async (p: any) => useMock ? supabaseMock.profiles.upsert(p) : (await client.from('profiles').upsert(p).select().single()).data
  },
  services: {
    getAll: async () => useMock ? supabaseMock.services.getAll() : (await client.from('services').select('*').order('name')).data || [],
    upsert: async (s: any) => useMock ? supabaseMock.services.upsert(s) : (await client.from('services').upsert(s).select().single()).data
  },
  team: {
    getAll: async () => useMock ? supabaseMock.team.getAll() : (await client.from('team_members').select('*')).data || [],
    upsert: async (m: any) => useMock ? supabaseMock.team.upsert(m) : (await client.from('team_members').upsert(m).select().single()).data
  },
  appointments: {
    getAll: async () => useMock ? supabaseMock.appointments.getAll() : (await client.from('appointments').select('*, services(*), profiles(*)').order('date')).data || [],
    upsert: async (a: any) => {
      if (useMock) return supabaseMock.appointments.upsert(a);
      const { services, profiles, ...clean } = a;
      return (await client.from('appointments').upsert(clean).select().single()).data;
    }
  },
  requests: {
    getAll: async () => useMock ? [] : (await client.from('leave_requests').select('*')).data || [],
    create: async (r: any) => useMock ? r : (await client.from('leave_requests').insert(r)).data,
    update: async (id: string, u: any) => useMock ? u : (await client.from('leave_requests').update(u).eq('id', id)).data,
    delete: async (id: string) => !useMock && await client.from('leave_requests').delete().eq('id', id)
  }
};
