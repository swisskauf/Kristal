
import { Appointment, User } from '../types';

// This simulates the Supabase behavior using LocalStorage
const STORAGE_KEY_APPOINTMENTS = 'kristal_appointments';
const STORAGE_KEY_USER = 'kristal_user';

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
  appointments: {
    getAll: (): Appointment[] => {
      const data = localStorage.getItem(STORAGE_KEY_APPOINTMENTS);
      return data ? JSON.parse(data) : [];
    },
    upsert: (app: Appointment) => {
      const current = supabaseMock.appointments.getAll();
      const exists = current.findIndex(a => a.id === app.id);
      if (exists > -1) {
        current[exists] = app;
      } else {
        current.push(app);
      }
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
