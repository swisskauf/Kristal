
export type TeamMemberName = string;

export type AbsenceType = 
  | 'vacation' 
  | 'sick' 
  | 'injury' 
  | 'maternity' 
  | 'paternity' 
  | 'training' 
  | 'bereavement' 
  | 'unpaid' 
  | 'overtime'
  | 'availability_change'
  | 'permit';

export interface SalonClosure {
  date: string;
  name: string;
}

export interface AboutUsContent {
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
}

export interface LeaveRequest {
  id: string;
  member_name: TeamMemberName;
  type: AbsenceType;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  is_full_day: boolean;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  admin_notes?: string;
  created_at: string;
}

export interface AbsenceEntry {
  id: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isFullDay: boolean;
  type: AbsenceType;
  hoursCount?: number; // Ore effettive per assenze parziali o calcolo straordinari
  notes?: string;
}

export interface TechnicalSheet {
  id: string;
  date: string;
  category: string;
  content: string;
  author: string;
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
  status: 'confirmed' | 'pending' | 'cancelled' | 'noshow';
  services?: { name: string; price: number; duration: number; category: string };
  profiles?: { full_name: string; phone: string; email?: string; treatment_history?: any[] };
  created_at: string;
}

export interface TeamMember {
  name: string;
  email: string; 
  role: string;
  bio?: string;
  avatar?: string;
  profile_id?: string; 
  absences_json?: AbsenceEntry[];
  unavailable_dates?: string[];
  weekly_closures?: number[];
  
  // HR & Time Tracking
  total_vacation_days?: number;   // Diritto annuale (es. 25)
  overtime_balance_hours?: number; // Ore di straordinario accumulate
  hours_per_day_contract?: number; // Ore contrattuali per giorno (es. 8)
  
  work_start_time?: string; 
  work_end_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  address?: string;
  avs_number?: string;
  iban?: string;
}

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: 'client' | 'admin' | 'collaborator';
  avatar?: string;
  gender?: 'M' | 'F' | 'Other';
  dob?: string;
  technical_sheets?: TechnicalSheet[];
  treatment_history?: { service: string; date?: string }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
