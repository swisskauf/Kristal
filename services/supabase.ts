
import { createClient } from '@supabase/supabase-js';

// Vite espone le variabili VITE_ tramite import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("ATTENZIONE: Variabili Supabase mancanti. Verifica VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY in Vercel.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const handleError = (error: any) => {
  console.error('Supabase Error:', error.message);
  return error;
};

export const db = {
  profiles: {
    get: async (id: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (error) return null;
      return data;
    },
    upsert: async (profile: any) => {
      const { data, error } = await supabase.from('profiles').upsert(profile).select().single();
      if (error) throw handleError(error);
      return data;
    }
  },
  services: {
    getAll: async () => {
      const { data, error } = await supabase.from('services').select('*').order('name');
      if (error) throw handleError(error);
      return data || [];
    },
    upsert: async (service: any) => {
      const { data, error } = await supabase.from('services').upsert(service).select().single();
      if (error) throw handleError(error);
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw handleError(error);
    }
  },
  team: {
    getAll: async () => {
      const { data, error } = await supabase.from('team_members').select('*').order('name');
      if (error) throw handleError(error);
      return data || [];
    },
    upsert: async (member: any) => {
      const { data, error } = await supabase.from('team_members').upsert(member).select().single();
      if (error) throw handleError(error);
      return data;
    },
    delete: async (name: string) => {
      const { error } = await supabase.from('team_members').delete().eq('name', name);
      if (error) throw handleError(error);
    }
  },
  appointments: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          services (name, price, duration),
          profiles (full_name)
        `)
        .order('date', { ascending: true });
      if (error) throw handleError(error);
      return data || [];
    },
    upsert: async (appointment: any) => {
      const { data, error } = await supabase.from('appointments').upsert(appointment).select().single();
      if (error) throw handleError(error);
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw handleError(error);
    }
  }
};
