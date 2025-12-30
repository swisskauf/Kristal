
import { Appointment, User, Service, TeamMember, LeaveRequest, SalonClosure, AboutUsContent } from '../types';
import { SERVICES as INITIAL_SERVICES, TEAM as INITIAL_TEAM } from '../constants';

const STORAGE_KEY_APPOINTMENTS = 'kristal_appointments';
const STORAGE_KEY_USER = 'kristal_user';
const STORAGE_KEY_SERVICES = 'kristal_services';
const STORAGE_KEY_TEAM = 'kristal_team';
const STORAGE_KEY_PROFILES = 'kristal_profiles';
const STORAGE_KEY_REQUESTS = 'kristal_requests';
const STORAGE_KEY_SALON_CLOSURES = 'kristal_salon_closures';
const STORAGE_KEY_ABOUT_US = 'kristal_about_us';

const DEFAULT_ABOUT_US: AboutUsContent = {
  title: "Kristal Atelier",
  subtitle: "L'Essenza della Bellezza a Lugano",
  description: "Da oltre un decennio, Kristal rappresenta il punto d'incontro tra l'artigianalità svizzera e l'avanguardia stilistica internazionale. Nel nostro atelier, ogni rituale è studiato per esaltare l'unicità di ogni ospite, utilizzando esclusivamente prodotti d'eccellenza e tecniche sartoriali. La nostra filosofia si basa sull'ascolto e sulla creazione di un'armonia perfetta tra immagine e benessere interiore.",
  imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200&h=600&auto=format&fit=crop"
};

const safeParse = (key: string, fallback: any) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    return fallback;
  }
};

export const supabaseMock = {
  auth: {
    getUser: () => safeParse(STORAGE_KEY_USER, null),
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
    getAll: () => safeParse(STORAGE_KEY_PROFILES, []),
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
    getAll: (): Service[] => safeParse(STORAGE_KEY_SERVICES, INITIAL_SERVICES),
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
      const data = safeParse(STORAGE_KEY_TEAM, INITIAL_TEAM);
      return data.map((m: any) => ({
        ...m,
        weekly_closures: Array.isArray(m.weekly_closures) ? m.weekly_closures.map(Number) : [],
        unavailable_dates: Array.isArray(m.unavailable_dates) ? m.unavailable_dates : [],
        absences_json: Array.isArray(m.absences_json) ? m.absences_json : []
      }));
    },
    upsert: (member: TeamMember) => {
      const current = supabaseMock.team.getAll();
      const idx = current.findIndex(m => m.name === member.name);
      const memberToSave = {
        ...member,
        weekly_closures: Array.isArray(member.weekly_closures) ? member.weekly_closures.map(Number) : [],
        unavailable_dates: Array.isArray(member.unavailable_dates) ? member.unavailable_dates : [],
        absences_json: Array.isArray(member.absences_json) ? member.absences_json : []
      };
      if (idx > -1) current[idx] = { ...current[idx], ...memberToSave };
      else current.push(memberToSave);
      localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(current));
      return memberToSave;
    }
  },
  appointments: {
    getAll: (): Appointment[] => safeParse(STORAGE_KEY_APPOINTMENTS, []),
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
    },
    delete: (id: string) => {
      const current = supabaseMock.appointments.getAll();
      const filtered = current.filter(a => a.id !== id);
      localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(filtered));
      return { error: null };
    }
  },
  requests: {
    getAll: (): LeaveRequest[] => safeParse(STORAGE_KEY_REQUESTS, []),
    create: (r: any) => {
      const current = supabaseMock.requests.getAll();
      const newReq = { ...r, id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      current.push(newReq);
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(current));
      return newReq;
    },
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
    delete: (id: string) => {
      const current = supabaseMock.requests.getAll();
      const filtered = current.filter((r: any) => r.id !== id);
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(filtered));
      return { error: null };
    }
  },
  salonClosures: {
    getAll: (): SalonClosure[] => {
      const data = safeParse(STORAGE_KEY_SALON_CLOSURES, []);
      return data.map((c: any) => {
        if (typeof c === 'string') return { date: c, name: 'Chiusura Straordinaria' };
        return { date: c.date, name: c.name || 'Chiusura Straordinaria' };
      });
    },
    save: (closures: SalonClosure[]) => {
      localStorage.setItem(STORAGE_KEY_SALON_CLOSURES, JSON.stringify(closures));
      return closures;
    }
  },
  aboutUs: {
    get: (): AboutUsContent => safeParse(STORAGE_KEY_ABOUT_US, DEFAULT_ABOUT_US),
    save: (content: AboutUsContent) => {
      localStorage.setItem(STORAGE_KEY_ABOUT_US, JSON.stringify(content));
      return content;
    }
  }
};
