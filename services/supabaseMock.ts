
import { Appointment, User, Service, TeamMember, LeaveRequest } from '../types';
import { SERVICES as INITIAL_SERVICES, TEAM as INITIAL_TEAM } from '../constants';

const STORAGE_KEY_APPOINTMENTS = 'kristal_appointments';
const STORAGE_KEY_USER = 'kristal_user';
const STORAGE_KEY_SERVICES = 'kristal_services';
const STORAGE_KEY_TEAM = 'kristal_team';
const STORAGE_KEY_PROFILES = 'kristal_profiles';
const STORAGE_KEY_REQUESTS = 'kristal_requests';

export const supabaseMock = {
  auth: {
    getUser: () => {
      const u = localStorage.getItem(STORAGE_KEY_USER);
      return u ? JSON.parse(u) as User : null;
    },
    signIn: (user: User) => {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      supabaseMock.profiles.upsert({
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar
      });
      return user;
    },
    signOut: () => {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  },
  profiles: {
    getAll: () => {
      const data = localStorage.getItem(STORAGE_KEY_PROFILES);
      if (!data) return [];
      return JSON.parse(data);
    },
    get: (id: string) => {
      const current = supabaseMock.profiles.getAll();
      return current.find((p: any) => p.id === id) || null;
    },
    upsert: (profile: any) => {
      const current = supabaseMock.profiles.getAll();
      const idx = current.findIndex((p: any) => p.id === profile.id || (p.email && p.email.toLowerCase() === profile.email?.toLowerCase()));
      const newProfile = {
        ...profile,
        id: profile.id || (idx > -1 ? current[idx].id : Math.random().toString(36).substr(2, 9))
      };
      if (idx > -1) current[idx] = { ...current[idx], ...newProfile };
      else current.push(newProfile);
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(current));
      return newProfile;
    }
  },
  services: {
    getAll: (): Service[] => {
      const data = localStorage.getItem(STORAGE_KEY_SERVICES);
      if (!data) return INITIAL_SERVICES;
      return JSON.parse(data);
    },
    upsert: (service: Service) => {
      const current = supabaseMock.services.getAll();
      const idx = current.findIndex(s => s.id === service.id);
      if (idx > -1) current[idx] = service;
      else current.push(service);
      localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(current));
      return service;
    }
  },
  team: {
    getAll: (): TeamMember[] => {
      const data = localStorage.getItem(STORAGE_KEY_TEAM);
      if (!data) return INITIAL_TEAM;
      const parsed = JSON.parse(data);
      return parsed.map((m: any) => ({
        ...m,
        weekly_closures: Array.isArray(m.weekly_closures) ? m.weekly_closures.map(Number) : []
      }));
    },
    upsert: (member: TeamMember) => {
      const current = supabaseMock.team.getAll();
      const idx = current.findIndex(m => m.name === member.name);
      const memberToSave = {
        ...member,
        weekly_closures: Array.isArray(member.weekly_closures) ? member.weekly_closures.map(Number) : [],
        unavailable_dates: Array.isArray(member.unavailable_dates) ? member.unavailable_dates : []
      };
      if (idx > -1) current[idx] = { ...current[idx], ...memberToSave };
      else current.push(memberToSave);
      localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(current));
      return memberToSave;
    }
  },
  appointments: {
    getAll: (): Appointment[] => {
      const data = localStorage.getItem(STORAGE_KEY_APPOINTMENTS);
      return data ? JSON.parse(data) : [];
    },
    upsert: (app: Appointment) => {
      const current = supabaseMock.appointments.getAll();
      const { services, profiles, ...cleanApp } = app;
      const id = cleanApp.id || Math.random().toString(36).substr(2, 9);
      const appToSave = { 
        ...cleanApp, 
        id,
        created_at: cleanApp.created_at || new Date().toISOString()
      };
      const existsIdx = current.findIndex(a => a.id === id);
      if (existsIdx > -1) current[existsIdx] = appToSave;
      else current.push(appToSave);
      localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(current));
      return appToSave;
    }
  },
  requests: {
    getAll: (): LeaveRequest[] => {
      const data = localStorage.getItem(STORAGE_KEY_REQUESTS);
      return data ? JSON.parse(data) : [];
    },
    create: (r: any) => {
      const current = supabaseMock.requests.getAll();
      const newReq = { ...r, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      current.push(newReq);
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(current));
      return newReq;
    },
    // Added update method to mock requests for consistency and to fix TS errors in supabase.ts
    update: (id: string, u: any) => {
      const current = supabaseMock.requests.getAll();
      const idx = current.findIndex((r: any) => r.id === id);
      if (idx > -1) {
        current[idx] = { ...current[idx], ...u };
        localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(current));
        return current[idx];
      }
      return null;
    },
    // Added delete method to mock requests for consistency and to fix TS errors in supabase.ts
    delete: (id: string) => {
      const current = supabaseMock.requests.getAll();
      const filtered = current.filter((r: any) => r.id !== id);
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(filtered));
      return { error: null };
    }
  }
};
