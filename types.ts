
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
  | 'overtime_recovery'
  | 'overtime'
  | 'availability_change'
  | 'permit';

export interface AbsenceEntry {
  id: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  isFullDay: boolean;
  type: AbsenceType;
  hoursCount: number; // Ore effettive calcolate per l'assenza o straordinario
  notes?: string;
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
  
  // Parametri HR Strategici Professionali
  total_vacation_days_per_year: number; // Diritto annuale (es. 25)
  hours_per_day_contract: number;       // Ore medie giornaliere (es. 8.5)
  overtime_balance_hours: number;       // Saldo ore straordinarie accumulato
  
  work_start_time?: string; 
  work_end_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  address?: string;
  avs_number?: string;
  iban?: string;
}

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
  created_at: string;
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
  profiles?: { full_name: string; phone: string; email?: string };
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: 'client' | 'admin' | 'collaborator';
  avatar?: string;
}
