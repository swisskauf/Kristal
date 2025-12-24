
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const VALID_ROLES = ['client', 'admin', 'collaborator'];

const handleError = (error: any) => {
  console.error('Supabase Error:', {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  });
  return error;
};

export const db = {
  profiles: {
    getAll: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw handleError(error);
      return data || [];
    },
    get: async (id: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
      if (error) return null;
      return data;
    },
    upsert: async (profile: any) => {
      // Validazione rigorosa del ruolo per evitare errori SQL Check Constraint
      const role = VALID_ROLES.includes(profile.role) ? profile.role : 'client';
      
      const payload: any = {
        id: profile.id,
        full_name: profile.full_name || profile.fullName || 'Ospite Kristal',
        role: role
      };

      if (profile.email) payload.email = profile.email;
      if (profile.phone) payload.phone = profile.phone;
      if (profile.avatar) payload.avatar = profile.avatar;
      if (profile.technical_sheets) payload.technical_sheets = profile.technical_sheets;
      if (profile.treatment_history) payload.treatment_history = profile.treatment_history;

      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
        
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
      const { data, error } = await supabase.from('services').upsert(service, { onConflict: 'id' }).select().single();
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
      const payload = {
        name: member.name,
        role: member.role,
        avatar: member.avatar,
        bio: member.bio,
        work_start_time: member.work_start_time || '08:30',
        work_end_time: member.work_end_time || '18:30',
        unavailable_dates: member.unavailable_dates || [],
        total_vacation_days: member.total_vacation_days ?? 25,
        absences_json: member.absences_json ?? []
      };
      
      const { data, error } = await supabase.from('team_members').upsert(payload, { onConflict: 'name' }).select().single();
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
          profiles (full_name, phone, email)
        `)
        .order('date', { ascending: true });
      if (error) throw handleError(error);
      return data || [];
    },
    upsert: async (appointment: any) => {
      const { services, profiles, ...cleanData } = appointment;
      const { data, error } = await supabase.from('appointments').upsert(cleanData, { onConflict: 'id' }).select().single();
      if (error) throw handleError(error);
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw handleError(error);
    }
  }
};
