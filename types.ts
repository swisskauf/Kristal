
export type TeamMemberName = string;

export type AbsenceType = 'vacation' | 'sick' | 'injury' | 'other';

export interface AbsenceEntry {
  id: string;
  startDate: string;
  endDate: string;
  type: AbsenceType;
  notes?: string;
}

export interface TreatmentRecord {
  date: string;
  service: string;
  notes: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; 
  category: string;
  description: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  service_id: string;
  team_member_name: TeamMemberName;
  date: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  services?: { name: string; price: number; duration: number };
  profiles?: { full_name: string; phone: string };
}

export interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  avatar?: string;
  unavailable_dates?: string[]; // Mantenuto per compatibilità legacy
  absences_json?: AbsenceEntry[]; // Nuovo campo strutturato
  total_vacation_days?: number;
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
  treatment_history?: TreatmentRecord[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
