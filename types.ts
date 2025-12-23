
export type TeamMemberName = string;

export interface TreatmentRecord {
  date: string;
  service: string;
  notes: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  category: string;
  description: string;
  assigned_team_members?: TeamMemberName[];
}

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  teamMember: TeamMemberName;
  date: string; // ISO string
  status: 'confirmed' | 'pending' | 'cancelled';
}

export interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  avatar?: string;
  unavailable_dates?: string[];
  start_hour?: number;
  end_hour?: number;
}

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: 'client' | 'admin';
  avatar?: string;
  treatment_history?: TreatmentRecord[]; // Scheda tecnica riservata
}

export interface AppSettings {
  instagram_enabled: boolean;
  instagram_username?: string;
  instagram_access_token?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
