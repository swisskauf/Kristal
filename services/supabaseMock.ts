
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
      if (!data) {
        const initialProfiles = [
          {
            id: 'admin-id-123',
            full_name: 'Direzione Kristal',
            email: 'serop.serop@outlook.com',
            role: 'admin',
            avatar: 'https://ui-avatars.com/api/?name=Admin+Kristal&background=000&color=fff'
          },
          {
            id: 'maurizio-id-456',
            full_name: 'Maurizio Stylist',
            email: 'sirop.sirop@outlook.sa',
            role: 'collaborator',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&h=200&auto=format&fit=crop'
          }
        ];
        localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(initialProfiles));
        return initialProfiles;
      }
      return JSON.parse(data);
    },
    upsert: (profile: any) => {
      const current = supabaseMock.profiles.getAll();
      const idx = current.findIndex((p: any) => p.id === profile.id || p.email?.toLowerCase() === profile.email?.toLowerCase());
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
      if (!data) {
        localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(INITIAL_SERVICES));
        return INITIAL_SERVICES;
      }
      return JSON.parse(data);
    },
    upsert: (service: Service) => {
      const current = supabaseMock.services.getAll();
      const idx = current.findIndex(s => s.id === service.id);
      if (idx > -1) current[idx] = service;
      else current.push(service);
      localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(current));
      return service;
    },
    delete: (id: string) => {
      const filtered = supabaseMock.services.getAll().filter(s => s.id !== id);
      localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(filtered));
    }
  },
  team: {
    getAll: (): TeamMember[] => {
      const data = localStorage.getItem(STORAGE_KEY_TEAM);
      if (!data) {
        localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(INITIAL_TEAM));
        return INITIAL_TEAM;
      }
      return JSON.parse(data);
    },
    upsert: (member: any) => {
      const current = supabaseMock.team.getAll();
      const idx = current.findIndex(m => m.name === member.name);
      if (idx > -1) {
        current[idx] = { ...current[idx], ...member };
      } else {
        current.push(member);
      }
      localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(current));
      return idx > -1 ? current[idx] : member;
    }
  },
  appointments: {
    getAll: (): Appointment[] => {
      const data = localStorage.getItem(STORAGE_KEY_APPOINTMENTS);
      return data ? JSON.parse(data) : [];
    },
    upsert: (app: Appointment) => {
      const current = supabaseMock.appointments.getAll();
      const exists = current.findIndex(a => a.id === app.id);
      if (exists > -1) current[exists] = app;
      else current.push({ ...app, id: app.id || Math.random().toString(36).substr(2, 9) });
      localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(current));
      return app;
    }
  },
  requests: {
    getAll: (): LeaveRequest[] => {
      const data = localStorage.getItem(STORAGE_KEY_REQUESTS);
      return data ? JSON.parse(data) : [];
    },
    create: (r: any) => {
      const current = supabaseMock.requests.getAll();
      const newReq = { ...r, id: Math.random().toString(36).substr(2, 9) };
      current.push(newReq);
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(current));
      return newReq;
    },
    update: (id: string, updates: any) => {
      const current = supabaseMock.requests.getAll();
      const idx = current.findIndex(r => r.id === id);
      if (idx > -1) {
        current[idx] = { ...current[idx], ...updates };
        localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(current));
      }
      return current[idx];
    },
    delete: (id: string) => {
      const current = supabaseMock.requests.getAll();
      const filtered = current.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(filtered));
    }
  }
};
