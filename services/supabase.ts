
import { createClient } from '@supabase/supabase-js';
import { supabaseMock } from './supabaseMock';

const getEnv = (key: string): string => {
  if (typeof window === 'undefined') return '';
  // @ts-ignore
  const v = (import.meta.env?.[key]) || (window.process?.env?.[key]) || '';
  return String(v).trim();
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

const isValidConfig = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseUrl !== 'undefined';

let client: any = null;
if (isValidConfig) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error("Errore critico inizializzazione Supabase:", e);
  }
}

export const useMock = !client;

// Semplice sistema di bus eventi per il mock
const authListeners: Set<(event: string, session: any) => void> = new Set();

const mockAuth = {
  getSession: async () => ({ data: { session: supabaseMock.auth.getUser() ? { user: supabaseMock.auth.getUser() } : null }, error: null }),
  onAuthStateChange: (cb: any) => {
    authListeners.add(cb);
    const user = supabaseMock.auth.getUser();
    if (user) setTimeout(() => cb('SIGNED_IN', { user }), 0);
    return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
  },
  signInWithPassword: async ({ email }: any) => {
    const user = { id: 'mock-user-' + Date.now(), email, fullName: 'Ospite Kristal', role: 'client' };
    supabaseMock.auth.signIn(user as any);
    authListeners.forEach(cb => cb('SIGNED_IN', { user }));
    return { data: { user, session: { user } }, error: null };
  },
  signUp: async (data: any) => {
    const user = { id: 'mock-user-' + Date.now(), email: data.email, fullName: data.options.data.full_name, role: data.options.data.role };
    supabaseMock.auth.signIn(user as any);
    authListeners.forEach(cb => cb('SIGNED_IN', { user }));
    return { data: { user, session: { user } }, error: null };
  },
  signOut: async () => { 
    supabaseMock.auth.signOut(); 
    authListeners.forEach(cb => cb('SIGNED_OUT', null));
    return { error: null }; 
  }
};

export const supabase = client || {
  auth: mockAuth,
  from: (table: string) => ({
    select: () => ({
      eq: () => ({ 
        maybeSingle: async () => ({ data: null, error: null }), 
        single: async () => ({ data: null, error: null }),
        order: () => ({ data: [], error: null })
      }),
      order: () => ({ data: [], error: null })
    })
  })
};

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
      if (useMock) {
        // Arricchimento mock per visualizzazione immediata
        const svcs = await db.services.getAll();
        const profs = await db.profiles.getAll();
        const service = svcs.find(s => s.id === a.service_id);
        const profile = profs.find(p => p.id === a.client_id);
        const enriched = { ...a, services: service, profiles: profile };
        return supabaseMock.appointments.upsert(enriched);
      }
      const { services, profiles, ...clean } = a;
      return (await client.from('appointments').upsert(clean).select().single()).data;
    }
  },
  requests: {
    getAll: async () => useMock ? supabaseMock.requests.getAll() : (await client.from('leave_requests').select('*')).data || [],
    create: async (r: any) => useMock ? supabaseMock.requests.create(r) : (await client.from('leave_requests').insert(r)).data,
    update: async (id: string, u: any) => useMock ? supabaseMock.requests.update(id, u) : (await client.from('leave_requests').update(u).eq('id', id)).data,
    delete: async (id: string) => useMock ? supabaseMock.requests.delete(id) : (await client.from('leave_requests').delete().eq('id', id))
  }
};
