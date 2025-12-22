
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper per gestire gli errori in modo centralizzato
const handleError = (error: any) => {
  console.error('Supabase Error:', error.message);
  throw error;
};

export const db = {
  profiles: {
    get: async (id: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) return null;
      return data;
    },
    upsert: async (profile: any) => {
      const { data, error } = await supabase.from('profiles').upsert(profile).select().single();
      if (error) handleError(error);
      return data;
    }
  },
  services: {
    getAll: async () => {
      const { data, error } = await supabase.from('services').select('*').order('name');
      if (error) handleError(error);
      return data || [];
    },
    upsert: async (service: any) => {
      const { data, error } = await supabase.from('services').upsert(service).select().single();
      if (error) handleError(error);
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) handleError(error);
    }
  },
  team: {
    getAll: async () => {
      const { data, error } = await supabase.from('team_members').select('*').order('name');
      if (error) handleError(error);
      return data || [];
    },
    upsert: async (member: any) => {
      const { data, error } = await supabase.from('team_members').upsert(member).select().single();
      if (error) handleError(error);
      return data;
    },
    delete: async (name: string) => {
      const { error } = await supabase.from('team_members').delete().eq('name', name);
      if (error) handleError(error);
    }
  },
  appointments: {
    getAll: async () => {
      // In produzione, un admin vedrebbe tutto, un client solo i suoi via RLS
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          services (name, price, duration)
        `)
        .order('date', { ascending: true });
      if (error) handleError(error);
      return data || [];
    },
    upsert: async (appointment: any) => {
      const { data, error } = await supabase.from('appointments').upsert(appointment).select().single();
      if (error) handleError(error);
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) handleError(error);
    }
  }
};
