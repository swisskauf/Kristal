
import { Appointment, User, Service, TeamMember } from '../types';
import { SERVICES as INITIAL_SERVICES, TEAM as INITIAL_TEAM } from '../constants';

const STORAGE_KEY_APPOINTMENTS = 'kristal_appointments';
const STORAGE_KEY_USER = 'kristal_user';
const STORAGE_KEY_SERVICES = 'kristal_services';
const STORAGE_KEY_TEAM = 'kristal_team';

export const supabaseMock = {
  auth: {
    getUser: () => {
      const u = localStorage.getItem(STORAGE_KEY_USER);
      return u ? JSON.parse(u) as User : null;
    },
    signIn: (user: User) => {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      return user;
    },
    signOut: () => {
      localStorage.removeItem(STORAGE_KEY_USER);
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
    },
    delete: (id: string) => {
      const filtered = supabaseMock.services.getAll().filter(s => s.id !== id);
      localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(filtered));
    }
  },
  team: {
    getAll: () => {
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
      if (idx > -1) current[idx] = member;
      else current.push(member);
      localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(current));
    },
    delete: (name: string) => {
      const filtered = supabaseMock.team.getAll().filter(m => m.name !== name);
      localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(filtered));
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
      else current.push(app);
      localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(current));
      return app;
    },
    delete: (id: string) => {
      const current = supabaseMock.appointments.getAll();
      const filtered = current.filter(a => a.id !== id);
      localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(filtered));
    }
  }
};
