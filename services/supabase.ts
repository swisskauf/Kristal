
import { createClient } from '@supabase/supabase-js';
import { supabaseMock } from './supabaseMock';

const getEnv = (key: string): string => {
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env ? process.env[key] : '') || '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

const realClient = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const useMock = !realClient;

export const supabase = realClient || ({
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (callback: any) => {
      const user = supabaseMock.auth.getUser();
      if (user) setTimeout(() => callback('SIGNED_IN', { user }), 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithPassword: async ({ email, password }: any) => {
      const mockUser = { id: 'mock-id', email, fullName: 'Utente Mock', role: 'admin' };
      supabaseMock.auth.signIn(mockUser as any);
      return { data: { user: mockUser, session: {} }, error: null };
    },
    signOut: async () => {
      supabaseMock.auth.signOut();
      return { error: null };
    }
  },
  from: () => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      order: () => ({ data: [], error: null })
    })
  })
} as any);

const VALID_ROLES = ['client', 'admin', 'collaborator'];

const handleError = (error: any) => {
  console.error('Supabase Error:', error);
  return error;
};

export const db = {
  profiles: {
    getAll: async () => {
      if (useMock) return [];
      const { data, error } = await realClient!.from('profiles').select('*').order('full_name');
      if (error) throw handleError(error);
      return data || [];
    },
    get: async (id: string) => {
      if (useMock) {
        const mockUser = supabaseMock.auth.getUser();
        if (mockUser && mockUser.id === id) return { ...mockUser, full_name: mockUser.fullName };
        return null;
      }
      const { data, error } = await realClient!.from('profiles').select('*').eq('id', id).maybeSingle();
      if (error) return null;
      return data;
    },
    upsert: async (profile: any) => {
      if (useMock) return profile;
      
      const emailLower = profile.email?.toLowerCase();
      let role = VALID_ROLES.includes(profile.role) ? profile.role : 'client';
      
      if (emailLower === 'serop.serop@outlook.com') role = 'admin';
      else if (emailLower === 'sirop.sirop@outlook.sa') role = 'collaborator';

      const payload: any = {
        id: profile.id,
        full_name: profile.full_name || profile.fullName || 'Ospite Kristal',
        role: role,
        email: profile.email,
        phone: profile.phone,
        avatar: profile.avatar,
        technical_sheets: profile.technical_sheets || [],
        treatment_history: profile.treatment_history || []
      };

      const { data, error } = await realClient!.from('profiles').upsert(payload, { onConflict: 'id' }).select().single();
      if (error) throw handleError(error);
      return data;
    }
  },
  services: {
    getAll: async () => {
      if (useMock) return supabaseMock.services.getAll();
      const { data, error } = await realClient!.from('services').select('*').order('name');
      if (error) throw handleError(error);
      return data || [];
    },
    upsert: async (service: any) => {
      if (useMock) return supabaseMock.services.upsert(service);
      const { data, error } = await realClient!.from('services').upsert(service, { onConflict: 'id' }).select().single();
      if (error) throw handleError(error);
      return data;
    },
    delete: async (id: string) => {
      if (useMock) return;
      const { error } = await realClient!.from('services').delete().eq('id', id);
      if (error) throw handleError(error);
    }
  },
  team: {
    getAll: async () => {
      if (useMock) return supabaseMock.team.getAll();
      const { data, error } = await realClient!.from('team_members').select('*').order('name');
      if (error) throw handleError(error);
      return data || [];
    },
    upsert: async (member: any) => {
      if (useMock) return supabaseMock.team.upsert(member);
      const payload = {
        name: member.name,
        role: member.role,
        avatar: member.avatar,
        bio: member.bio,
        profile_id: member.profile_id,
        work_start_time: member.work_start_time || '08:30',
        work_end_time: member.work_end_time || '18:30',
        unavailable_dates: member.unavailable_dates || [],
        total_vacation_days: member.total_vacation_days ?? 25,
        absences_json: member.absences_json ?? []
      };
      const { data, error } = await realClient!.from('team_members').upsert(payload, { onConflict: 'name' }).select().single();
      if (error) throw handleError(error);
      return data;
    }
  },
  appointments: {
    getAll: async () => {
      if (useMock) return supabaseMock.appointments.getAll();
      const { data, error } = await realClient!
        .from('appointments')
        .select(`*, services (name, price, duration), profiles (full_name, phone, email)`)
        .order('date', { ascending: true });
      if (error) throw handleError(error);
      return data || [];
    },
    upsert: async (appointment: any) => {
      if (useMock) return supabaseMock.appointments.upsert(appointment);
      const { services, profiles, ...cleanData } = appointment;
      const { data, error } = await realClient!.from('appointments').upsert(cleanData, { onConflict: 'id' }).select().single();
      if (error) throw handleError(error);
      return data;
    }
  },
  requests: {
    getAll: async () => {
      if (useMock) return [];
      const { data, error } = await realClient!.from('leave_requests').select('*').order('created_at', { ascending: false });
      if (error) throw handleError(error);
      return data || [];
    },
    create: async (request: any) => {
      if (useMock) return request;
      const { data, error } = await realClient!.from('leave_requests').insert(request).select().single();
      if (error) throw handleError(error);
      return data;
    },
    update: async (id: string, updates: any) => {
      if (useMock) return updates;
      const { data, error } = await realClient!.from('leave_requests').update(updates).eq('id', id).select().single();
      if (error) throw handleError(error);
      return data;
    },
    delete: async (id: string) => {
      if (useMock) return;
      const { error } = await realClient!.from('leave_requests').delete().eq('id', id);
      if (error) throw handleError(error);
    }
  }
};
