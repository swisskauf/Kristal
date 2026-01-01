
import { createClient } from '@supabase/supabase-js';
import { supabaseMock } from './supabaseMock';
import { SalonClosure, AboutUsContent } from '../types';

// Helper sicuro per leggere variabili d'ambiente in Vite/Browser
const getEnv = (key: string): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return String(import.meta.env[key]).trim();
    }
  } catch (e) {}

  try {
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      const val = process.env[key];
      if (val) return String(val).trim();
    }
  } catch (e) {}

  return '';
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

const authListeners: Set<(event: string, session: any) => void> = new Set();

const mockAuth = {
  getSession: async () => ({ data: { session: supabaseMock.auth.getUser() ? { user: supabaseMock.auth.getUser() } : null }, error: null }),
  onAuthStateChange: (cb: any) => {
    authListeners.add(cb);
    const user = supabaseMock.auth.getUser();
    if (user) {
      // Timeout per simulare asincronicità ed evitare blocchi nel ciclo di render
      setTimeout(() => cb('SIGNED_IN', { user, session: { user } }), 0);
    } else {
      setTimeout(() => cb('SIGNED_OUT', null), 0);
    }
    return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
  },
  signInWithPassword: async ({ email }: any) => {
    const existingProfile = (supabaseMock.profiles.getAll() as any[]).find(p => p.email?.toLowerCase() === email.toLowerCase());

    if (existingProfile && existingProfile.is_blocked) {
        return { data: { user: null, session: null }, error: { message: "Account sospeso. Contattare l'atelier." } };
    }

    const role = email === 'serop.serop@outlook.com' ? 'admin' : (email === 'sirop.sirop@outlook.sa' ? 'collaborator' : 'client');
    
    const user = { 
        id: existingProfile?.id || 'mock-user-' + Date.now(), 
        email, 
        fullName: existingProfile?.full_name || (role === 'admin' ? 'Direzione Kristal' : (role === 'collaborator' ? 'Maurizio Stylist' : 'Ospite Kristal')), 
        role 
    };
    supabaseMock.auth.signIn(user as any);
    const session = { user };
    authListeners.forEach(cb => cb('SIGNED_IN', session));
    return { data: { user, session }, error: null };
  },
  signUp: async (data: any) => {
    const { email, password, options } = data;
    const metadata = options?.data || {};
    
    const id = 'mock-user-' + Date.now();
    const profile = {
        id: id,
        full_name: metadata.full_name,
        email: email,
        phone: metadata.phone,
        role: metadata.role || 'client',
        gender: metadata.gender,
        dob: metadata.dob, 
        avatar: metadata.avatar,
        address: metadata.address,
        avs_number: metadata.avs_number,
        iban: metadata.iban,
        is_blocked: false
    };
    
    supabaseMock.profiles.upsert(profile);

    const user = { 
        id: id, 
        email: email, 
        ...metadata
    };
    
    supabaseMock.auth.signIn(user as any);
    const session = { user };
    authListeners.forEach(cb => cb('SIGNED_IN', session));
    return { data: { user, session }, error: null };
  },
  signOut: async () => { 
    supabaseMock.auth.signOut(); 
    authListeners.forEach(cb => cb('SIGNED_OUT', null));
    return { error: null }; 
  }
};

let supabaseExport: any;

if (client) {
  // Real Supabase - Override sicuro del metodo signInWithPassword SULL'ISTANZA esistente.
  const originalSignIn = client.auth.signInWithPassword.bind(client.auth);
  client.auth.signInWithPassword = async (credentials: any) => {
     const { email } = credentials;
     const { data: profile } = await client.from('profiles').select('is_blocked').eq('email', email).maybeSingle();
     if (profile && profile.is_blocked) {
          return { data: { user: null, session: null }, error: { message: "Account sospeso per motivi amministrativi." } };
     }
     return originalSignIn(credentials);
  };
  supabaseExport = client;
} else {
  // Mock Supabase
  supabaseExport = {
    auth: mockAuth,
    from: (table: string) => ({
      select: (cols: string = '*') => ({
        eq: (col: string, val: any) => ({ 
          maybeSingle: async () => ({ data: null, error: null }), 
          single: async () => ({ data: null, error: null }),
          order: (oCol: string) => ({ data: [], error: null })
        }),
        order: (oCol: string) => ({ data: [], error: null })
      })
    })
  };
}

export const supabase = supabaseExport;

export const db = {
  profiles: {
    getAll: async () => useMock ? supabaseMock.profiles.getAll() : (await client.from('profiles').select('*').order('full_name')).data || [],
    get: async (id: string) => {
      if (useMock) return (supabaseMock.profiles.getAll() as any[]).find(p => p.id === id) || null;
      return (await client.from('profiles').select('*').eq('id', id).maybeSingle()).data;
    },
    upsert: async (p: any) => {
      if (useMock) return supabaseMock.profiles.upsert(p);
      return (await client.from('profiles').upsert(p, { onConflict: 'id' }).select().single()).data;
    },
    delete: async (id: string) => {
        if (useMock) {
            const current = supabaseMock.profiles.getAll();
            const filtered = current.filter((p:any) => p.id !== id);
            localStorage.setItem('kristal_profiles', JSON.stringify(filtered));
            return { error: null };
        }
        
        try {
           const { error } = await client.rpc('delete_user_account', { user_id: id });
           if (!error) return { error: null };
           console.warn("RPC delete_user_account fallita, fallback su delete semplice:", error);
        } catch (e) {
           console.warn("RPC non disponibile o errore:", e);
        }

        return await client.from('profiles').delete().eq('id', id);
    }
  },
  services: {
    getAll: async () => useMock ? supabaseMock.services.getAll() : (await client.from('services').select('*').order('name')).data || [],
    upsert: async (s: any) => useMock ? supabaseMock.services.upsert(s) : (await client.from('services').upsert(s).select().single()).data
  },
  team: {
    getAll: async () => {
      const data = useMock ? supabaseMock.team.getAll() : (await client.from('team_members').select('*')).data || [];
      return data.map((m: any) => ({
        ...m,
        weekly_closures: Array.isArray(m.weekly_closures) ? m.weekly_closures.map(Number) : []
      }));
    },
    upsert: async (m: any) => useMock ? supabaseMock.team.upsert(m) : (await client.from('team_members').upsert(m).select().single()).data
  },
  appointments: {
    getAll: async () => {
      let appts = [];
      if (useMock) {
        appts = supabaseMock.appointments.getAll();
      } else {
        const { data } = await client.from('appointments').select('*, services(*), profiles(*)').order('date');
        appts = data || [];
      }
      
      if (useMock || (appts.length > 0 && !appts[0].services)) {
        const svcs = await db.services.getAll();
        const profs = await db.profiles.getAll();
        return appts.map((a: any) => ({
          ...a,
          services: a.services || svcs.find(s => s.id === a.service_id),
          profiles: a.profiles || profs.find(p => p.id === a.client_id)
        }));
      }
      return appts;
    },
    upsert: async (a: any) => {
      if (useMock) return supabaseMock.appointments.upsert(a);
      const { services, profiles, ...clean } = a;
      return (await client.from('appointments').upsert(clean).select().single()).data;
    }
  },
  requests: {
    getAll: async () => useMock ? supabaseMock.requests.getAll() : (await client.from('leave_requests').select('*')).data || [],
    create: async (r: any) => useMock ? supabaseMock.requests.create(r) : (await client.from('leave_requests').insert(r)).data,
    update: async (id: string, u: any) => useMock ? supabaseMock.requests.update(id, u) : (await client.from('leave_requests').update(u).eq('id', id)).data,
    delete: async (id: string) => useMock ? supabaseMock.requests.delete(id) : (await client.from('leave_requests').delete().eq('id', id))
  },
  salonClosures: {
    getAll: async () => useMock ? supabaseMock.salonClosures.getAll() : (await client.from('salon_closures').select('*')).data || [],
    add: async (closure: SalonClosure) => {
      if (useMock) {
        const current = supabaseMock.salonClosures.getAll();
        const exists = current.find(c => c.date === closure.date);
        if (!exists) {
          const updated = [...current, closure];
          supabaseMock.salonClosures.save(updated);
        }
        return closure;
      }
      const { data } = await client.from('salon_closures').insert(closure).select();
      return data;
    },
    delete: async (date: string) => {
      if (useMock) {
        const current = supabaseMock.salonClosures.getAll();
        const filtered = current.filter(c => c.date !== date);
        supabaseMock.salonClosures.save(filtered);
        return { error: null };
      }
      return await client.from('salon_closures').delete().eq('date', date);
    },
    save: async (closures: SalonClosure[]) => {
      if (useMock) return supabaseMock.salonClosures.save(closures);
      return (await client.from('salon_closures').upsert(closures)).data;
    }
  },
  aboutUs: {
    get: async () => {
        if (useMock) return supabaseMock.aboutUs.get();
        // Use maybeSingle to prevent error if no row exists
        const { data } = await client.from('settings').select('*').eq('key', 'about_us').maybeSingle();
        return data?.value;
    },
    save: async (content: AboutUsContent) => {
      if (useMock) return supabaseMock.aboutUs.save(content);
      // Upsert: tries to update, if not found inserts
      const { data, error } = await client.from('settings')
        .upsert({ key: 'about_us', value: content }, { onConflict: 'key' })
        .select();
        
      if (error) {
          console.error("Supabase Save Error:", error);
          throw error;
      }
      
      // Se select() non ritorna dati (può capitare con alcune policy), ritorniamo il content inviato
      return data?.[0]?.value || content;
    }
  }
};
