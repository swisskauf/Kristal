
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
  | 'availability_change';

export interface LeaveRequest {
  id: string;
  member_name: TeamMemberName;
  type: AbsenceType;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  admin_notes?: string;
  created_at: string;
}

export interface AbsenceEntry {
  id: string;
  startDate: string;
  endDate: string;
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  type: AbsenceType;
  notes?: string;
}

export interface TechnicalSheet {
  id: string;
  date: string;
  category: string;
  content: string;
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
  status: 'confirmed' | 'pending' | 'cancelled' | 'noshow';
  services?: { name: string; price: number; duration: number };
  profiles?: { full_name: string; phone: string; email?: string };
}

export interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  avatar?: string;
  profile_id?: string; 
  unavailable_dates?: string[]; 
  absences_json?: AbsenceEntry[];
  total_vacation_days?: number;
  work_start_time?: string; 
  work_end_time?: string;   
  overtime_balance?: number; 
}

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: 'client' | 'admin' | 'collaborator';
  avatar?: string;
  treatment_history?: TreatmentRecord[];
  technical_sheets?: TechnicalSheet[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
