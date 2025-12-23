
export type TeamMemberName = string;

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  category: string;
  description: string;
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
  unavailable_dates?: string[]; // Array di date ISO (YYYY-MM-DD)
}

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: 'client' | 'admin';
  avatar?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
