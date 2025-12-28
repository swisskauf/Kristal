import { Appointment, User, Service, TeamMember } from '../types';

const STORAGE_KEY_APPOINTMENTS = 'kristal_appointments';
const STORAGE_KEY_USER = 'kristal_user';

export const supabaseMock = {
  auth: {
    getUser: () => {
      const user = localStorage.getItem(STORAGE_KEY_USER);
      return user ? JSON.parse(user) as User : null;
    },
    signIn: (user: User) => {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      return user;
    },
    signOut: () => {
      localStorage.removeItem(STORAGE_KEY_USER);
    },
  },
  appointments: {
    getAll: (): Appointment[] => {
      const data = localStorage.getItem(STORAGE_KEY_APPOINTMENTS);
      console.log("Recupero appuntamenti dal mock:", data);
      return data ? JSON.parse(data) : [];
    },
    upsert: (app: Appointment) => {
      const current = supabaseMock.appointments.getAll();
      const existsIdx = current.findIndex((a) => a.id === app.id);

      const appToSave = { 
        ...app, 
        id: app.id || Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
      };

      if (existsIdx > -1) {
        current[existsIdx] = { ...current[existsIdx], ...appToSave };
      } else {
        current.push(appToSave);
      }

      console.log("Appuntamenti aggiornati nel mock:", current);
      localStorage.setItem(STORAGE_KEY_APPOINTMENTS, JSON.stringify(current));
      return appToSave;
    },
  },
};
